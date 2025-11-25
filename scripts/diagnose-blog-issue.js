/**
 * Comprehensive diagnostic script for blog post issues
 */

const { PrismaClient } = require('@prisma/client');
const { prisma: dbPrisma } = require('../src/lib/db');

async function diagnose() {
  console.log('🔍 Blog Post System Diagnostic\n');
  console.log('='.repeat(60));
  
  // 1. Check direct Prisma Client
  console.log('\n1️⃣ Testing Direct PrismaClient:');
  const directClient = new PrismaClient();
  try {
    console.log('   - BlogPost model available:', typeof directClient.blogPost !== 'undefined' ? '✅ YES' : '❌ NO');
    if (typeof directClient.blogPost !== 'undefined') {
      const count = await directClient.blogPost.count();
      console.log('   - Can query blog_posts:', `✅ YES (${count} posts)`);
    }
  } catch (error) {
    console.log('   - Error:', error.message);
  }
  
  // 2. Check exported prisma from db.ts
  console.log('\n2️⃣ Testing Exported Prisma from db.ts:');
  try {
    console.log('   - BlogPost model available:', typeof dbPrisma.blogPost !== 'undefined' ? '✅ YES' : '❌ NO');
    if (typeof dbPrisma.blogPost !== 'undefined') {
      const count = await dbPrisma.blogPost.count();
      console.log('   - Can query blog_posts:', `✅ YES (${count} posts)`);
    } else {
      console.log('   - Available models:', Object.keys(dbPrisma).filter(k => !k.startsWith('$') && !k.startsWith('_')).slice(0, 10).join(', '));
    }
  } catch (error) {
    console.log('   - Error:', error.message);
    console.log('   - Error code:', error.code);
  }
  
  // 3. Check database connection
  console.log('\n3️⃣ Testing Database Connection:');
  try {
    const dbInfo = await directClient.$queryRaw`SELECT current_database(), current_schema()`;
    console.log('   - Database:', dbInfo[0].current_database);
    console.log('   - Schema:', dbInfo[0].current_schema);
    
    const tableExists = await directClient.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blog_posts'
      ) as exists;
    `;
    console.log('   - blog_posts table exists:', tableExists[0].exists ? '✅ YES' : '❌ NO');
  } catch (error) {
    console.log('   - Error:', error.message);
  }
  
  // 4. Check Prisma Client generation
  console.log('\n4️⃣ Checking Prisma Client:');
  try {
    const fs = require('fs');
    const clientPath = './node_modules/.prisma/client/index.d.ts';
    if (fs.existsSync(clientPath)) {
      const clientContent = fs.readFileSync(clientPath, 'utf8');
      const hasBlogPost = clientContent.includes('blogPost') || clientContent.includes('BlogPost');
      console.log('   - BlogPost in generated client:', hasBlogPost ? '✅ YES' : '❌ NO');
    } else {
      console.log('   - Prisma Client not found at:', clientPath);
    }
  } catch (error) {
    console.log('   - Error:', error.message);
  }
  
  // 5. Test create operation with direct client
  console.log('\n5️⃣ Testing Create Operation (Direct Client):');
  try {
    const testPost = await directClient.blogPost.create({
      data: {
        slug: `diagnostic-test-${Date.now()}`,
        title: 'Diagnostic Test',
        excerpt: 'Test',
        content: 'Test content',
        publishedAt: new Date(),
      },
    });
    console.log('   - Create with direct client:', '✅ SUCCESS');
    await directClient.blogPost.delete({ where: { id: testPost.id } });
    console.log('   - Cleanup:', '✅ SUCCESS');
  } catch (error) {
    console.log('   - Create with direct client:', '❌ FAILED');
    console.log('   - Error:', error.message);
    console.log('   - Error code:', error.code);
  }
  
  // 6. Test create operation with exported prisma
  console.log('\n6️⃣ Testing Create Operation (Exported Prisma):');
  try {
    if (typeof dbPrisma.blogPost !== 'undefined') {
      const testPost = await dbPrisma.blogPost.create({
        data: {
          slug: `diagnostic-test-2-${Date.now()}`,
          title: 'Diagnostic Test 2',
          excerpt: 'Test',
          content: 'Test content',
          publishedAt: new Date(),
        },
      });
      console.log('   - Create with exported prisma:', '✅ SUCCESS');
      await dbPrisma.blogPost.delete({ where: { id: testPost.id } });
      console.log('   - Cleanup:', '✅ SUCCESS');
    } else {
      console.log('   - Cannot test: BlogPost model not available');
    }
  } catch (error) {
    console.log('   - Create with exported prisma:', '❌ FAILED');
    console.log('   - Error:', error.message);
    console.log('   - Error code:', error.code);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Diagnostic complete\n');
  
  await directClient.$disconnect();
  await dbPrisma.$disconnect();
}

diagnose().catch(console.error);

