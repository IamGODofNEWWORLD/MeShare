import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Heart,
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Share2,
  Award,
  Tag,
  X,
  Link2,
} from "lucide-react";

const DormShareApp = () => {
  const [activeTab, setActiveTab] = useState("board");
  const [posts, setPosts] = useState([]);
  const [expiryItems, setExpiryItems] = useState([]);
  const [userStats, setUserStats] = useState({ borrowed: 0, shared: 0 });

  const [showPostForm, setShowPostForm] = useState(false);
  const [showExpiryForm, setShowExpiryForm] = useState(false);

  const [likedPosts, setLikedPosts] = useState([]);
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState("");

  // タグUI
  const [activeTag, setActiveTag] = useState("ALL"); // "ALL" or tag string

  // 投稿フォーム
  const [newPost, setNewPost] = useState({
    type: "offer",
    title: "",
    description: "",
    deadline: "",
    image: null,
    tags: [],
    linkedExpiryId: "", // 期限アイテム連携
  });
  const [tagInput, setTagInput] = useState("");

  // 賞味期限アイテムフォーム
  const [newExpiryItem, setNewExpiryItem] = useState({
    name: "",
    expiryDate: "",
    quantity: "",
    tags: [],
  });
  const [expiryTagInput, setExpiryTagInput] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const postsResult = await window.storage.get("share-posts");
      const expiryResult = await window.storage.get("expiry-items");
      const statsResult = await window.storage.get("user-stats");
      const likedResult = await window.storage.get("liked-posts");
      const commentsResult = await window.storage.get("comments");

      if (postsResult) setPosts(JSON.parse(postsResult.value));
      if (expiryResult) setExpiryItems(JSON.parse(expiryResult.value));
      if (statsResult) setUserStats(JSON.parse(statsResult.value));
      if (likedResult) setLikedPosts(JSON.parse(likedResult.value));
      if (commentsResult) setComments(JSON.parse(commentsResult.value));
    } catch (error) {
      console.log("データの読み込み:", error);
    }
  };

  const saveData = async (key, data) => {
    try {
      await window.storage.set(key, JSON.stringify(data));
    } catch (error) {
      console.error("保存エラー:", error);
    }
  };

  // -----------------------
  // タグ操作ユーティリティ
  // -----------------------
  const normalizeTag = (t) => t.trim().replace(/^#/, "");
  const uniq = (arr) => Array.from(new Set(arr));

  const addTagToNewPost = (raw) => {
    const t = normalizeTag(raw);
    if (!t) return;
    setNewPost((p) => ({ ...p, tags: uniq([...(p.tags || []), t]) }));
  };

  const removeTagFromNewPost = (t) => {
    setNewPost((p) => ({ ...p, tags: (p.tags || []).filter((x) => x !== t) }));
  };

  const addTagToNewExpiry = (raw) => {
    const t = normalizeTag(raw);
    if (!t) return;
    setNewExpiryItem((it) => ({ ...it, tags: uniq([...(it.tags || []), t]) }));
  };

  const removeTagFromNewExpiry = (t) => {
    setNewExpiryItem((it) => ({ ...it, tags: (it.tags || []).filter((x) => x !== t) }));
  };

  // 期限アイテム参照（投稿連携用）
  const expiryMap = useMemo(() => {
    const m = new Map();
    for (const it of expiryItems) m.set(String(it.id), it);
    return m;
  }, [expiryItems]);

  // 投稿一覧のタグ集計
  const allTags = useMemo(() => {
    const tags = [];
    for (const p of posts) (p.tags || []).forEach((t) => tags.push(t));
    return uniq(tags).sort((a, b) => a.localeCompare(b, "ja"));
  }, [posts]);

  // タグで絞り込んだ投稿
  const filteredPosts = useMemo(() => {
    if (activeTag === "ALL") return posts;
    return posts.filter((p) => (p.tags || []).includes(activeTag));
  }, [posts, activeTag]);

  // -----------------------
  // 投稿を追加（タグ＋期限連携）
  // -----------------------
  const handleAddPost = async () => {
    if (!newPost.title.trim()) return;

    // 期限アイテム連携があるなら、自動的に「期限」も寄せる（未入力なら）
    let deadline = newPost.deadline;
    let mergedTags = [...(newPost.tags || [])];

    if (newPost.linkedExpiryId) {
      const linked = expiryMap.get(String(newPost.linkedExpiryId));
      if (linked) {
        if (!deadline) deadline = linked.expiryDate || "";
        mergedTags = uniq([...(mergedTags || []), ...(linked.tags || [])]);
      }
    }

    const post = {
      id: Date.now(),
      ...newPost,
      deadline,
      tags: mergedTags,
      linkedExpiryId: newPost.linkedExpiryId || "",
      status: "open",
      thanks: 0,
      createdAt: new Date().toISOString(),
      userName: "あなた",
    };

    const updatedPosts = [post, ...posts];
    setPosts(updatedPosts);
    await saveData("share-posts", updatedPosts);

    // 統計を更新
    if (newPost.type === "offer") {
      const newStats = { ...userStats, shared: userStats.shared + 1 };
      setUserStats(newStats);
      await saveData("user-stats", newStats);
    }

    setNewPost({
      type: "offer",
      title: "",
      description: "",
      deadline: "",
      image: null,
      tags: [],
      linkedExpiryId: "",
    });
    setTagInput("");
    setShowPostForm(false);
  };

  // -----------------------
  // 賞味期限アイテムを追加（タグ）
  // -----------------------
  const handleAddExpiryItem = async () => {
    if (!newExpiryItem.name.trim() || !newExpiryItem.expiryDate) return;

    const item = {
      id: Date.now(),
      ...newExpiryItem,
      tags: uniq(newExpiryItem.tags || []),
      createdAt: new Date().toISOString(),
    };

    const updatedItems = [item, ...expiryItems];
    setExpiryItems(updatedItems);
    await saveData("expiry-items", updatedItems);

    setNewExpiryItem({ name: "", expiryDate: "", quantity: "", tags: [] });
    setExpiryTagInput("");
    setShowExpiryForm(false);
  };

  // -----------------------
  // ステータス変更
  // -----------------------
  const handleStatusChange = async (postId) => {
    const updatedPosts = posts.map((post) => {
      if (post.id === postId) {
        return { ...post, status: post.status === "open" ? "resolved" : "open" };
      }
      return post;
    });
    setPosts(updatedPosts);
    await saveData("share-posts", updatedPosts);

    // 借りた回数を更新（offerがopen→resolvedになる瞬間だけ）
    const post = posts.find((p) => p.id === postId);
    if (post && post.type === "offer" && post.status === "open") {
      const newStats = { ...userStats, borrowed: userStats.borrowed + 1 };
      setUserStats(newStats);
      await saveData("user-stats", newStats);
    }
  };

  // 感謝（1回のみ）
  const handleThanks = async (postId) => {
    if (likedPosts.includes(postId)) return;

    const updatedPosts = posts.map((post) => {
      if (post.id === postId) {
        return { ...post, thanks: post.thanks + 1 };
      }
      return post;
    });
    setPosts(updatedPosts);
    await saveData("share-posts", updatedPosts);

    const updatedLiked = [...likedPosts, postId];
    setLikedPosts(updatedLiked);
    await saveData("liked-posts", updatedLiked);
  };

  // コメント
  const handleAddComment = async (postId) => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      text: newComment,
      userName: "あなた",
      createdAt: new Date().toISOString(),
    };

    const updatedComments = {
      ...comments,
      [postId]: [...(comments[postId] || []), comment],
    };
    setComments(updatedComments);
    await saveData("comments", updatedComments);
    setNewComment("");
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // 期限アイテム削除：連携している投稿のリンクも外す（壊れ参照防止）
  const handleDeleteExpiryItem = async (itemId) => {
    const updatedItems = expiryItems.filter((item) => item.id !== itemId);
    setExpiryItems(updatedItems);
    await saveData("expiry-items", updatedItems);

    const updatedPosts = posts.map((p) =>
      String(p.linkedExpiryId || "") === String(itemId) ? { ...p, linkedExpiryId: "" } : p
    );
    setPosts(updatedPosts);
    await saveData("share-posts", updatedPosts);
  };

  // 期限までの日数
  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryColor = (days) => {
    if (days < 0) return "text-gray-400";
    if (days <= 2) return "text-red-600";
    if (days <= 5) return "text-orange-500";
    return "text-green-600";
  };

  // 期限アイテム→投稿フォームへ（タグも期限も連携）
  const startShareFromExpiryItem = (item) => {
    setActiveTab("board");
    setShowPostForm(true);
    setNewPost({
      type: "offer",
      title: `${item.name}あります`,
      description: `賞味期限: ${item.expiryDate}${item.quantity ? ` / 量: ${item.quantity}` : ""}`,
      deadline: item.expiryDate,
      image: null,
      tags: uniq([...(item.tags || []), item.name]), // 食材名もタグに混ぜる（検索性UP）
      linkedExpiryId: String(item.id),
    });
    setTagInput("");
  };

  // タグバッジ（共通）
  const TagChips = ({ tags, onClickTag, removable = false, onRemove }) => {
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {tags.map((t) => (
          <span
            key={t}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
              onClickTag ? "cursor-pointer hover:bg-gray-50" : ""
            }`}
            onClick={() => onClickTag && onClickTag(t)}
            title={onClickTag ? `#${t} で絞り込み` : `#${t}`}
          >
            <Tag size={12} className="opacity-70" />
            #{t}
            {removable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove?.(t);
                }}
                className="ml-1 text-gray-500 hover:text-red-600"
                title="削除"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">めシェア</h1>
        <p className="text-center text-sm mt-1 opacity-90">みんなで助け合おう</p>
      </div>

      {/* タブ */}
      <div className="bg-white shadow flex">
        <button
          onClick={() => setActiveTab("board")}
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === "board" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
          }`}
        >
          <MessageSquare className="inline mr-1" size={18} />
          掲示板
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === "stats" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
          }`}
        >
          <Award className="inline mr-1" size={18} />
          実績
        </button>
        <button
          onClick={() => setActiveTab("expiry")}
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === "expiry" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
          }`}
        >
          <Calendar className="inline mr-1" size={18} />
          期限
        </button>
        <button
          onClick={() => setActiveTab("community")}
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === "community" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
          }`}
        >
          <Users className="inline mr-1" size={18} />
          みんな
        </button>
      </div>

      {/* -----------------------
          掲示板
      ----------------------- */}
      {activeTab === "board" && (
        <div className="p-4">
          {/* タグフィルタ */}
          <div className="bg-white p-3 rounded-lg shadow mb-4">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm flex items-center gap-2">
                <Tag size={16} className="text-blue-600" />
                タグで絞り込み
              </div>
              {activeTag !== "ALL" && (
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setActiveTag("ALL")}
                >
                  解除
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag("ALL")}
                className={`px-3 py-1 rounded-full text-xs border ${
                  activeTag === "ALL" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700"
                }`}
              >
                全部
              </button>
              {allTags.length === 0 ? (
                <span className="text-xs text-gray-500">まだタグがありません</span>
              ) : (
                allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTag(t)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      activeTag === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700"
                    }`}
                    title={`#${t}`}
                  >
                    #{t}
                  </button>
                ))
              )}
            </div>
          </div>

          {!showPostForm ? (
            <button
              onClick={() => setShowPostForm(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium mb-4 flex items-center justify-center hover:bg-blue-700"
            >
              <Plus size={20} className="mr-2" />
              新しい投稿
            </button>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setNewPost({ ...newPost, type: "offer" })}
                  className={`flex-1 py-2 rounded ${
                    newPost.type === "offer" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  提供する
                </button>
                <button
                  onClick={() => setNewPost({ ...newPost, type: "request" })}
                  className={`flex-1 py-2 rounded ${
                    newPost.type === "request" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  欲しい
                </button>
              </div>

              {/* 期限アイテム連携 */}
              <div className="mb-3">
                <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                  <Link2 size={14} className="text-blue-600" />
                  期限アイテムと連携（任意）
                </label>
                <select
                  value={newPost.linkedExpiryId}
                  onChange={(e) => setNewPost({ ...newPost, linkedExpiryId: e.target.value })}
                  className="w-full p-2 border rounded text-sm bg-white"
                >
                  <option value="">連携しない</option>
                  {expiryItems
                    .slice()
                    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
                    .map((it) => {
                      const days = getDaysUntilExpiry(it.expiryDate);
                      return (
                        <option key={it.id} value={String(it.id)}>
                          {it.name}（期限:{it.expiryDate} / あと{days}日）
                        </option>
                      );
                    })}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  連携すると「期限」と「タグ」を自動補完します（未入力のとき）。
                </p>
              </div>

              <input
                type="text"
                placeholder="タイトル（例：しょうゆあります）"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              />
              <textarea
                placeholder="詳細（任意）"
                value={newPost.description}
                onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                className="w-full p-2 border rounded mb-2 h-20"
              />

              <input
                type="date"
                value={newPost.deadline}
                onChange={(e) => setNewPost({ ...newPost, deadline: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              />

              {/* タグ入力 */}
              <div className="mb-3">
                <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                  <Tag size={14} className="text-blue-600" />
                  タグ（Enterで追加 / #不要）
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTagToNewPost(tagInput);
                        setTagInput("");
                      }
                    }}
                    placeholder="例: 調味料 / しょうゆ / 共同"
                    className="flex-1 p-2 border rounded text-sm"
                  />
                  <button
                    onClick={() => {
                      addTagToNewPost(tagInput);
                      setTagInput("");
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    追加
                  </button>
                </div>
                <TagChips tags={newPost.tags} removable onRemove={removeTagFromNewPost} />
              </div>

              <div className="flex gap-2">
                <button onClick={handleAddPost} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                  投稿
                </button>
                <button
                  onClick={() => setShowPostForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* 投稿一覧 */}
          <div className="space-y-3">
            {filteredPosts.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {posts.length === 0 ? "まだ投稿がありません" : "このタグの投稿はありません"}
              </div>
            ) : (
              filteredPosts.map((post) => {
                const linked = post.linkedExpiryId ? expiryMap.get(String(post.linkedExpiryId)) : null;

                return (
                  <div
                    key={post.id}
                    className={`bg-white p-4 rounded-lg shadow ${post.status === "resolved" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium mr-2 ${
                            post.type === "offer" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {post.type === "offer" ? "提供" : "欲しい"}
                        </span>
                        {post.status === "resolved" && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600">
                            解決済み
                          </span>
                        )}
                        {linked && (
                          <span className="inline-flex items-center gap-1 ml-2 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <Link2 size={12} />
                            期限連携
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleStatusChange(post.id)} className="text-gray-400 hover:text-blue-600">
                        <CheckCircle size={20} />
                      </button>
                    </div>

                    <h3 className="font-bold text-lg mb-1">{post.title}</h3>
                    {post.description && <p className="text-gray-600 text-sm mb-2">{post.description}</p>}

                    {/* タグ表示（クリックで絞り込み） */}
                    <TagChips
                      tags={post.tags || []}
                      onClickTag={(t) => setActiveTag(t)}
                    />

                    {/* 連携している期限アイテムの表示 */}
                    {linked && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="text-xs text-blue-700 font-bold flex items-center gap-2">
                          <Calendar size={14} />
                          期限アイテム: {linked.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          期限: {linked.expiryDate} {linked.quantity ? ` / 量: ${linked.quantity}` : ""}
                        </div>
                        <TagChips tags={linked.tags || []} onClickTag={(t) => setActiveTag(t)} />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                      <div className="flex items-center gap-3">
                        <span>{post.userName}</span>
                        {post.deadline && (
                          <span className="flex items-center">
                            <Clock size={12} className="mr-1" />
                            {post.deadline}まで
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
                        >
                          <MessageSquare size={14} />
                          <span>{comments[post.id]?.length || 0}</span>
                        </button>
                        <button
                          onClick={() => handleThanks(post.id)}
                          disabled={likedPosts.includes(post.id)}
                          className={`flex items-center gap-1 ${
                            likedPosts.includes(post.id)
                              ? "text-red-500 cursor-not-allowed"
                              : "text-gray-400 hover:text-red-600"
                          }`}
                        >
                          <Heart size={14} fill={likedPosts.includes(post.id) ? "currentColor" : "none"} />
                          <span>{post.thanks}</span>
                        </button>
                      </div>
                    </div>

                    {/* コメント */}
                    {showComments[post.id] && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="space-y-2 mb-3">
                          {comments[post.id]?.map((comment) => (
                            <div key={comment.id} className="bg-gray-50 p-2 rounded">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-700">{comment.userName}</span>
                                <span className="text-xs text-gray-400">
                                  {new Date(comment.createdAt).toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800">{comment.text}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="コメントを入力..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                            className="flex-1 p-2 text-sm border rounded"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            送信
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* -----------------------
          実績
      ----------------------- */}
      {activeTab === "stats" && (
        <div className="p-4">
          <div className="bg-blue-600 p-6 rounded-lg shadow mb-4 text-white">
            <h2 className="text-xl font-bold mb-4 text-center">今月の実績</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white bg-opacity-20 rounded-lg">
                <div className="text-3xl font-bold">{userStats.shared}</div>
                <div className="text-sm mt-1">提供した回数</div>
              </div>
              <div className="text-center p-4 bg-white bg-opacity-20 rounded-lg">
                <div className="text-3xl font-bold">{userStats.borrowed}</div>
                <div className="text-sm mt-1">借りた回数</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
                <Award size={20} />
                <span className="font-medium">
                  {userStats.shared + userStats.borrowed >= 20
                    ? "スーパーヘルパー"
                    : userStats.shared + userStats.borrowed >= 10
                    ? "アクティブメンバー"
                    : "ビギナー"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              みんなの活動
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                <span className="text-sm">今月の総提供数</span>
                <span className="font-bold text-green-600">{posts.filter((p) => p.type === "offer").length}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                <span className="text-sm">今月の総依頼数</span>
                <span className="font-bold text-orange-600">{posts.filter((p) => p.type === "request").length}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                <span className="text-sm">総感謝数</span>
                <span className="font-bold text-red-600">{posts.reduce((sum, p) => sum + p.thanks, 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-3">最近の活動</h3>
            {posts.length === 0 ? (
              <div className="text-center text-gray-500 py-4">まだ活動がありません</div>
            ) : (
              <div className="space-y-2">
                {posts.slice(0, 10).map((post) => (
                  <div key={post.id} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{post.title}</div>
                      <div className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString("ja-JP")}</div>
                      <div className="mt-1">
                        <TagChips tags={post.tags || []} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          post.type === "offer" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {post.type === "offer" ? "提供" : "依頼"}
                      </span>
                      <Heart size={14} className="text-red-500" fill="currentColor" />
                      <span className="text-sm">{post.thanks}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -----------------------
          期限管理（タグ＋掲示板連携）
      ----------------------- */}
      {activeTab === "expiry" && (
        <div className="p-4">
          {!showExpiryForm ? (
            <button
              onClick={() => setShowExpiryForm(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium mb-4 flex items-center justify-center hover:bg-blue-700"
            >
              <Plus size={20} className="mr-2" />
              食材を追加
            </button>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <input
                type="text"
                placeholder="食材名（例：牛乳）"
                value={newExpiryItem.name}
                onChange={(e) => setNewExpiryItem({ ...newExpiryItem, name: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              />
              <input
                type="date"
                value={newExpiryItem.expiryDate}
                onChange={(e) => setNewExpiryItem({ ...newExpiryItem, expiryDate: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              />
              <input
                type="text"
                placeholder="量（任意）"
                value={newExpiryItem.quantity}
                onChange={(e) => setNewExpiryItem({ ...newExpiryItem, quantity: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              />

              {/* 期限アイテムのタグ */}
              <div className="mb-3">
                <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                  <Tag size={14} className="text-blue-600" />
                  タグ（Enterで追加）
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={expiryTagInput}
                    onChange={(e) => setExpiryTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTagToNewExpiry(expiryTagInput);
                        setExpiryTagInput("");
                      }
                    }}
                    placeholder="例: 調味料 / 乳製品 / 共同"
                    className="flex-1 p-2 border rounded text-sm"
                  />
                  <button
                    onClick={() => {
                      addTagToNewExpiry(expiryTagInput);
                      setExpiryTagInput("");
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    追加
                  </button>
                </div>
                <TagChips tags={newExpiryItem.tags} removable onRemove={removeTagFromNewExpiry} />
              </div>

              <div className="flex gap-2">
                <button onClick={handleAddExpiryItem} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                  追加
                </button>
                <button
                  onClick={() => setShowExpiryForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {expiryItems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">登録された食材がありません</div>
            ) : (
              expiryItems
                .slice()
                .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
                .map((item) => {
                  const daysLeft = getDaysUntilExpiry(item.expiryDate);
                  const colorClass = getExpiryColor(daysLeft);

                  // この期限アイテムに連携してる投稿数
                  const linkedCount = posts.filter((p) => String(p.linkedExpiryId || "") === String(item.id)).length;

                  return (
                    <div key={item.id} className="bg-white p-4 rounded-lg shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{item.name}</h3>
                          {item.quantity && <p className="text-sm text-gray-600">{item.quantity}</p>}

                          {/* タグ */}
                          <TagChips tags={item.tags || []} />

                          <div className={`text-sm font-medium mt-2 ${colorClass}`}>
                            {daysLeft < 0 ? "期限切れ" : daysLeft === 0 ? "今日が期限" : `あと${daysLeft}日`}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">期限: {item.expiryDate}</div>

                          {linkedCount > 0 && (
                            <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                              <Link2 size={12} />
                              連携投稿: {linkedCount}件
                            </div>
                          )}
                        </div>

                        <button onClick={() => handleDeleteExpiryItem(item.id)} className="text-gray-400 hover:text-red-600">
                          <CheckCircle size={20} />
                        </button>
                      </div>

                      {/* 期限が近い時：掲示板へシェア誘導（タグ＋期限連携） */}
                      {daysLeft >= 0 && daysLeft <= 3 && (
                        <button
                          onClick={() => startShareFromExpiryItem(item)}
                          className="w-full mt-3 bg-orange-500 text-white py-2 rounded text-sm hover:bg-orange-600"
                        >
                          掲示板に「シェア投稿」を作る（期限連携）
                        </button>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* -----------------------
          コミュニティ
      ----------------------- */}
      {activeTab === "community" && (
        <div className="p-4">
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              寮内統計
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{posts.length}</div>
                <div className="text-xs text-gray-600 mt-1">総投稿数</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{posts.filter((p) => p.status === "resolved").length}</div>
                <div className="text-xs text-gray-600 mt-1">解決済み</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{posts.reduce((sum, p) => sum + p.thanks, 0)}</div>
                <div className="text-xs text-gray-600 mt-1">総感謝数</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.values(comments).reduce((sum, c) => sum + c.length, 0)}
                </div>
                <div className="text-xs text-gray-600 mt-1">総コメント数</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Award size={18} className="text-yellow-600" />
              人気の投稿
            </h3>
            {posts.length === 0 ? (
              <div className="text-center text-gray-500 py-4">まだ投稿がありません</div>
            ) : (
              <div className="space-y-2">
                {posts
                  .slice()
                  .sort((a, b) => b.thanks - a.thanks)
                  .slice(0, 5)
                  .map((post, index) => (
                    <div key={post.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? "bg-yellow-400 text-yellow-900"
                            : index === 1
                            ? "bg-gray-300 text-gray-700"
                            : index === 2
                            ? "bg-orange-300 text-orange-900"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{post.title}</div>
                        <div className="text-xs text-gray-500">{post.userName}</div>
                        <div className="mt-1">
                          <TagChips tags={post.tags || []} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-red-500">
                        <Heart size={14} fill="currentColor" />
                        <span className="text-sm font-bold">{post.thanks}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Share2 size={18} className="text-green-600" />
              よくシェアされる物（ダミー）
            </h3>
            <div className="space-y-2">
              {["調味料", "飲料", "野菜", "肉・魚", "お菓子"].map((category, index) => (
                <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${100 - index * 20}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{5 - index}件</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              ※ここは後で「タグ集計（投稿の tags を数える）」に置き換えると一気にリアルになります。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DormShareApp;
