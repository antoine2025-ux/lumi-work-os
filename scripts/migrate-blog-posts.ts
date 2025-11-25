/**
 * Migration script to move existing blog posts from markdown files to database
 * Run with: npx ts-node scripts/migrate-blog-posts.ts
 */

import { prisma } from '../src/lib/db';
import { getAllBlogPosts } from '../src/lib/blog';

async function migratePosts() {
  console.log('🔄 Starting blog posts migration...\n');
  
  try {
    const posts = await getAllBlogPosts();
    console.log(`Found ${posts.length} blog posts to migrate\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const post of posts) {
      try {
        const result = await prisma.blogPost.upsert({
          where: { slug: post.slug },
          update: {
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            authorName: post.author.name,
            publishedAt: new Date(post.publishedAt),
            tags: post.tags,
            readingTime: post.readingTime || 5,
            coverImage: post.coverImage || null,
          },
          create: {
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            authorName: post.author.name,
            publishedAt: new Date(post.publishedAt),
            tags: post.tags,
            readingTime: post.readingTime || 5,
            coverImage: post.coverImage || null,
          },
        });
        
        // Check if it was created or updated
        const existing = await prisma.blogPost.findUnique({
          where: { slug: post.slug },
        });
        
        if (existing && existing.createdAt.getTime() === existing.updatedAt.getTime()) {
          console.log(`✅ Created: ${post.slug}`);
          successCount++;
        } else {
          console.log(`🔄 Updated: ${post.slug}`);
          skipCount++;
        }
      } catch (error: any) {
        console.error(`❌ Failed to migrate ${post.slug}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Created: ${successCount}`);
    console.log(`   🔄 Updated: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n✨ Migration complete!`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migratePosts();

