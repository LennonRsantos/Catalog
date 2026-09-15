const { createClient } = require('@supabase/supabase-js');

const URL = 'https://jrsmakeclgkcsnnmjztx.supabase.co';
const ANON_KEY = process.env.SB_ANON;
const SECRET_KEY = process.env.SB_SECRET;

const admin = createClient(URL, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

function log(label, ok, extra) {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) process.exitCode = 1;
}

async function signInAs(email, password) {
  const client = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

(async () => {
  const suffix = Date.now();
  const emailA = `smoketest-a-${suffix}@example.com`;
  const emailB = `smoketest-b-${suffix}@example.com`;
  const password = 'TestPass123!';
  let uidA, uidB, postId;

  try {
    // 1. Signup trigger creates profile + generated handle
    const { data: userA, error: errA } = await admin.auth.admin.createUser({
      email: emailA, password, email_confirm: true,
      user_metadata: { name: 'Smoke Test A' },
    });
    if (errA) throw errA;
    uidA = userA.user.id;

    const { data: userB, error: errB } = await admin.auth.admin.createUser({
      email: emailB, password, email_confirm: true,
      user_metadata: { name: 'Smoke Test B' },
    });
    if (errB) throw errB;
    uidB = userB.user.id;

    const { data: profA } = await admin.from('profiles').select('*').eq('id', uidA).single();
    log('handle_new_user created profile A', !!profA);
    log('handle auto-generated with @ prefix', /^@[A-Z][a-z0-9]{6}$/.test(profA?.handle ?? ''), profA?.handle);
    log('role defaults to user', profA?.role === 'user', profA?.role);

    const clientA = await signInAs(emailA, password);
    const clientB = await signInAs(emailB, password);

    // 2. profiles RLS: A cannot read B's full profile row
    const { data: aReadsB } = await clientA.from('profiles').select('*').eq('id', uidB);
    log('profiles RLS blocks reading a stranger\'s full row', (aReadsB ?? []).length === 0);

    // 3. public_profiles view: A CAN find B by handle (findability by design)
    const { data: aFindsB } = await clientA.from('public_profiles').select('*').eq('uid', uidB);
    log('public_profiles view exposes findability slice', (aFindsB ?? []).length === 1);

    // 4. publish_post RPC (private post)
    const { data: privatePost, error: privErr } = await clientA.rpc('publish_post', {
      p_tmdb_id: 123, p_media_type: 'movie', p_type: 'Filme', p_title: 'Smoke Test Movie',
      p_cover_url: 'https://example.com/cover.jpg', p_rating: 9, p_review: 'great',
      p_visibility: 'private', p_mentions: [], p_mentions_all: false,
    });
    log('publish_post RPC works', !privErr && !!privatePost, privErr?.message);
    postId = privatePost?.id;

    // 5. B cannot read A's private post
    const { data: bReadsPrivate } = await clientB.from('posts').select('*').eq('id', postId);
    log('private post invisible to non-owner', (bReadsPrivate ?? []).length === 0);

    // 6. friendship flow: A sends request, B accepts
    const [lo, hi] = uidA < uidB ? [uidA, uidB] : [uidB, uidA];
    const { error: frErr } = await clientA.from('friendships').insert({
      uid_a: lo, uid_b: hi, requested_by: uidA, status: 'pending',
    });
    log('friend request insert (RLS)', !frErr, frErr?.message);

    const { error: acceptErr } = await clientB.from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('uid_a', lo).eq('uid_b', hi);
    log('friend request accept (RLS, other-party-only)', !acceptErr, acceptErr?.message);

    // 7. publish a "friends" post from A, confirm B can now see it, stranger can't
    const { data: friendsPost, error: fpErr } = await clientA.rpc('publish_post', {
      p_tmdb_id: 456, p_media_type: 'tv', p_type: 'Série', p_title: 'Friends Post',
      p_cover_url: 'https://example.com/cover2.jpg', p_rating: 8, p_review: 'nice',
      p_visibility: 'friends', p_mentions: [], p_mentions_all: false,
    });
    log('publish_post (friends visibility)', !fpErr && !!friendsPost, fpErr?.message);

    const { data: bReadsFriendsPost } = await clientB.from('posts').select('*').eq('id', friendsPost?.id);
    log('friend CAN read "friends"-visibility post', (bReadsFriendsPost ?? []).length === 1);

    // 8. toggle_like RPC + notification fan-out
    const { data: likeResult, error: likeErr } = await clientB.rpc('toggle_like', { p_post_id: friendsPost?.id });
    log('toggle_like RPC (like)', !likeErr && likeResult?.[0]?.out_liked === true, likeErr?.message);

    const { data: notif } = await admin.from('notifications').select('*').eq('recipient_uid', uidA).eq('type', 'like');
    log('like notification created for post author', (notif ?? []).length === 1);

    // 9. add_comment RPC + comment_count bump
    const { data: comment, error: commentErr } = await clientB.rpc('add_comment', {
      p_post_id: friendsPost?.id, p_text: 'nice pick!', p_mentions: [], p_mentions_all: false,
    });
    log('add_comment RPC', !commentErr && !!comment, commentErr?.message);

    const { data: postAfterComment } = await admin.from('posts').select('comment_count, like_count').eq('id', friendsPost?.id).single();
    log('comment_count incremented atomically', postAfterComment?.comment_count === 1, String(postAfterComment?.comment_count));
    log('like_count incremented atomically', postAfterComment?.like_count === 1, String(postAfterComment?.like_count));

    // 10. favorites_public view: mark a catalog item favorite as A, confirm B (friend) can see the safe slice only
    const { error: catErr } = await clientA.from('catalog_items').insert({
      id: `smoke-${suffix}`, owner_uid: uidA, title: 'Fav Movie', type: 'Filme', status: 'Visto',
      rating: 10, review: 'SECRET REVIEW TEXT', cover_url: 'https://example.com/c.jpg', is_favorite: true,
    });
    log('catalog insert (own)', !catErr, catErr?.message);

    const { data: bReadsCatalogDirect } = await clientB.from('catalog_items').select('*').eq('owner_uid', uidA);
    log('catalog_items RLS blocks friend from reading raw table (no review leak)', (bReadsCatalogDirect ?? []).length === 0);

    const { data: bReadsFavView } = await clientB.from('favorites_public').select('*').eq('owner_uid', uidA);
    log('favorites_public view exposes safe slice to friend', (bReadsFavView ?? []).length === 1);
    log('favorites_public NEVER includes review/status columns', bReadsFavView?.[0] && !('review' in bReadsFavView[0]) && !('status' in bReadsFavView[0]));

    console.log('\nSmoke test done.');
  } catch (e) {
    console.error('UNEXPECTED ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    // Cleanup — cascades wipe everything derived from these two users.
    if (uidA) await admin.auth.admin.deleteUser(uidA).catch(() => {});
    if (uidB) await admin.auth.admin.deleteUser(uidB).catch(() => {});
    console.log('Cleaned up test accounts.');
  }
})();
