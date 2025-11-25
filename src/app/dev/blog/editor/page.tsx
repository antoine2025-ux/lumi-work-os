"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, ArrowLeft, Eye, Edit2, X } from "lucide-react";
import { MarkdownContent } from "@/components/blog/markdown-content";
import { MarkdownWysiwygEditor } from "@/components/blog/markdown-wysiwyg-editor";
import { BlogPost } from "@/lib/blog";

export default function BlogEditorPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  
  // Form state
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    author: "Loopwell Team",
    publishedAt: new Date().toISOString().split("T")[0],
    tags: [] as string[],
    readingTime: 5,
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/dev-auth/check");
      if (response.ok) {
        setIsAuthenticated(true);
        loadPosts();
      } else {
        setIsAuthenticated(false);
        router.push("/dev-login");
      }
    } catch (error) {
      setIsAuthenticated(false);
      router.push("/dev-login");
    }
  };

  const loadPosts = async () => {
    try {
      const response = await fetch("/api/dev-blog/posts");
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const handleNewPost = () => {
    setSelectedPost(null);
    setIsEditing(true);
    setViewMode("edit");
    setFormData({
      slug: "",
      title: "",
      excerpt: "",
      content: "",
      author: "Loopwell Team",
      publishedAt: new Date().toISOString().split("T")[0],
      tags: [],
      readingTime: 5,
    });
  };

  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setIsEditing(true);
    setViewMode("edit");
    setFormData({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author.name,
      publishedAt: post.publishedAt,
      tags: post.tags,
      readingTime: post.readingTime || 5,
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      alert("Please fill in title and content");
      return;
    }

    setIsSaving(true);
    try {
      const url = selectedPost
        ? `/api/dev-blog/posts/${selectedPost.slug}`
        : "/api/dev-blog/posts";
      
      const response = await fetch(url, {
        method: selectedPost ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadPosts();
        setIsEditing(false);
        setSelectedPost(null);
        alert("Post saved successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save post");
      }
    } catch (error) {
      alert("Error saving post");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/blog")}
                className="text-slate-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                View Blog
              </Button>
              <h1 className="text-xl font-semibold text-white">Blog Editor</h1>
            </div>
            <Button
              onClick={() => {
                fetch("/api/dev-auth/logout", { method: "POST" });
                router.push("/dev-login");
              }}
              variant="ghost"
              className="text-slate-300 hover:text-white"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Posts List Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-white">Posts</CardTitle>
                  <Button
                    onClick={handleNewPost}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {posts.map((post) => (
                    <div
                      key={post.slug}
                      onClick={() => handleEditPost(post)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors text-sm ${
                        selectedPost?.slug === post.slug
                          ? "bg-blue-600 border border-blue-500"
                          : "bg-slate-700 hover:bg-slate-600 border border-transparent"
                      }`}
                    >
                      <div className="font-medium text-white line-clamp-2">{post.title}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3">
            {isEditing ? (
              <div className="space-y-4">
                {/* Metadata Fields */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-white">
                      {selectedPost ? "Edit Post" : "New Post"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Slug</label>
                        <Input
                          value={formData.slug}
                          onChange={(e) =>
                            setFormData({ ...formData, slug: e.target.value })
                          }
                          placeholder="my-post-slug"
                          className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Published Date</label>
                        <Input
                          type="date"
                          value={formData.publishedAt}
                          onChange={(e) =>
                            setFormData({ ...formData, publishedAt: e.target.value })
                          }
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
                      <Input
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="Post title"
                        className="bg-slate-900 border-slate-600 text-white text-lg placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Excerpt</label>
                      <Input
                        value={formData.excerpt}
                        onChange={(e) =>
                          setFormData({ ...formData, excerpt: e.target.value })
                        }
                        placeholder="Brief description"
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Author</label>
                        <Input
                          value={formData.author}
                          onChange={(e) =>
                            setFormData({ ...formData, author: e.target.value })
                          }
                          className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Tags</label>
                        <div className="flex gap-2">
                          <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                            placeholder="Add tag"
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                          />
                          <Button onClick={handleAddTag} size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="bg-slate-700 text-slate-300 border-slate-600"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-2 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Content Editor */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-white">Content</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={viewMode === "edit" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setViewMode("edit")}
                          className={`h-8 ${
                            viewMode === "edit"
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "border-slate-600 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant={viewMode === "preview" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            // Force a small delay to ensure content is synced
                            setTimeout(() => {
                              setViewMode("preview");
                            }, 0);
                          }}
                          className={`h-8 ${
                            viewMode === "preview"
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "border-slate-600 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {viewMode === "edit" ? (
                      <MarkdownWysiwygEditor
                        content={formData.content}
                        onChange={(content) => setFormData({ ...formData, content })}
                        placeholder="Start writing your blog post..."
                      />
                    ) : (
                      <div className="border border-slate-600 rounded-lg bg-slate-900 min-h-[600px] p-6">
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -m-6 p-6 rounded-t-lg mb-6">
                          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">
                            {formData.title || "Untitled Post"}
                          </h1>
                          {formData.excerpt && (
                            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                              {formData.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-6 text-sm text-slate-400">
                            <span>{new Date(formData.publishedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}</span>
                            <span>{formData.readingTime} min read</span>
                            <span>By {formData.author}</span>
                          </div>
                        </div>
                        <MarkdownContent content={formData.content || "*No content yet*"} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Post"}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedPost(null);
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  {formData.slug && (
                    <Button
                      onClick={() => router.push(`/blog/${formData.slug}`)}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Published
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <p className="text-slate-300 mb-4">
                    Select a post to edit or create a new one
                  </p>
                  <Button onClick={handleNewPost} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Post
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
