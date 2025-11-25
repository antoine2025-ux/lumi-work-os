/**
 * Test script to verify blog_posts table exists and can be accessed
 * Run with: node scripts/test-blog-db.js
 */

const { PrismaClient } = require('@prisma/client');

async function testBlogDatabase() {
  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  try {
    console.log('🔍 Testing blog_posts database connection...\n');

    // 1. Check database connection
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_schema()`;
    console.log('📊 Connected to:', dbInfo[0].current_database, 'schema:', dbInfo[0].current_schema);

    // 2. Check if table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blog_posts'
      ) as exists;
    `;
    
    if (!tableExists[0].exists) {
      console.log('\n❌ ERROR: blog_posts table does NOT exist!');
      console.log('   Run: node scripts/run-blog-migration.js');
      process.exit(1);
    }
    
    console.log('✅ blog_posts table EXISTS');

    // 3. Check Prisma Client has BlogPost model
    if (typeof prisma.blogPost === 'undefined') {
      console.log('\n❌ ERROR: Prisma Client does not have blogPost model!');
      console.log('   Run: npx prisma generate');
      process.exit(1);
    }
    
    console.log('✅ Prisma Client has blogPost model');

    // 4. Try to query the table
    const count = await prisma.blogPost.count();
    console.log(`✅ Can query blog_posts table (${count} posts)`);

    // 5. Try to create a test post (then delete it)
    console.log('\n🧪 Testing create operation...');
    const testPost = await prisma.blogPost.create({
      data: {
        slug: `test-${Date.now()}`,
        title: 'Test Post',
        excerpt: 'This is a test',
        content: 'Test content',
        publishedAt: new Date(),
      },
    });
    console.log('✅ Can CREATE blog post:', testPost.slug);

    // Clean up test post
    await prisma.blogPost.delete({
      where: { id: testPost.id },
    });
    console.log('✅ Can DELETE blog post');

    console.log('\n✨ All tests passed! Blog database is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      meta: error.meta,
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testBlogDatabase();

