import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, LearningStatus } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Dependency-free .env loader
function loadEnv() {
  if (!process.env.DATABASE_URL) {
    const candidatePaths = [
      path.resolve(__dirname, '../.env'),
      path.resolve(__dirname, '../../.env'),
      path.resolve(__dirname, '../../../.env'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        content.split('\n').forEach((line) => {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match && !process.env[match[1]]) {
            let val = (match[2] || '').trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            process.env[match[1]] = val;
          }
        });
      }
    }
  }
}

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is not set.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface SeedWordItem {
  word: string;
  article?: string | null;
  plural?: string | null;
  translation?: string | null;
  definition?: string | null;
  partOfSpeech?: string | null;
  contextSentence?: string | null;
  contextSourceUrl?: string | null;
  tags?: string[];
  notes?: string | null;
  sourceLanguage?: string;
  targetLanguage?: string;
}

async function main() {
  console.log('\n======================================================');
  console.log('🚀 Starting Vocabulary Seeder...');
  console.log('======================================================\n');

  const defaultUserId = 'default-user';

  // Step 1: Ensure default user exists
  await prisma.user.upsert({
    where: { id: defaultUserId },
    update: {},
    create: {
      id: defaultUserId,
      name: 'Default User',
      role: 'USER',
    },
  });

  // Step 2: Locate JSON seed file(s)
  const dataDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Data directory "${dataDir}" not found.`);
    process.exit(1);
  }

  const jsonFiles = fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.warn(`⚠️ No .json files found in ${dataDir}. Place your AI-generated JSON in this folder.`);
    return;
  }

  // Step 3: Fetch existing words from database to skip DB duplicates
  console.log('🔍 Checking existing vocabulary in database...');
  const existingWords = await prisma.userVocabulary.findMany({
    where: { userId: defaultUserId },
    select: { word: true, sourceLanguage: true },
  });

  const existingDbSet = new Set<string>(
    existingWords.map((w) => `${w.sourceLanguage.toLowerCase()}:${w.word.trim().toLowerCase()}`)
  );
  console.log(`ℹ️  Found ${existingDbSet.size} words currently in database.\n`);

  const seenInBatch = new Set<string>();
  const toInsert: any[] = [];
  let totalInputCount = 0;
  let skippedBatchDuplicates = 0;
  let skippedDbDuplicates = 0;

  // Step 4: Process all JSON files in the data directory
  for (const file of jsonFiles) {
    const filePath = path.join(dataDir, file);
    console.log(`📂 Reading: ${file}`);
    try {
      const rawData = fs.readFileSync(filePath, 'utf8');
      const items: SeedWordItem[] = JSON.parse(rawData);

      if (!Array.isArray(items)) {
        console.warn(`⚠️ File ${file} does not contain a JSON array. Skipping.`);
        continue;
      }

      totalInputCount += items.length;

      for (const item of items) {
        if (!item || !item.word || typeof item.word !== 'string') continue;

        let word = item.word.trim();
        let article = item.article ? item.article.trim().toLowerCase() : null;

        // Auto-fix if AI included article in the word itself ("der Hund" -> article: "der", word: "Hund")
        const match = word.match(/^(der|die|das)\s+(.+)$/i);
        if (match) {
          if (!article) article = match[1].toLowerCase();
          word = match[2].trim();
        }

        const sourceLanguage = (item.sourceLanguage || 'de').trim().toLowerCase();
        const targetLanguage = (item.targetLanguage || 'en').trim().toLowerCase();
        const dedupeKey = `${sourceLanguage}:${word.toLowerCase()}`;

        // Duplicate check #1: Against other items in this batch
        if (seenInBatch.has(dedupeKey)) {
          skippedBatchDuplicates++;
          continue;
        }
        seenInBatch.add(dedupeKey);

        // Duplicate check #2: Against words already in PostgreSQL
        if (existingDbSet.has(dedupeKey)) {
          skippedDbDuplicates++;
          continue;
        }

        // Add to insert queue
        toInsert.push({
          userId: defaultUserId,
          word,
          article: article || null,
          plural: item.plural?.trim() || null,
          translation: item.translation?.trim() || null,
          definition: item.definition?.trim() || null,
          partOfSpeech: item.partOfSpeech?.trim() || null,
          contextSentence: item.contextSentence?.trim() || null,
          contextSourceUrl: item.contextSourceUrl?.trim() || null,
          tags: Array.isArray(item.tags) ? item.tags : [],
          notes: item.notes?.trim() || null,
          sourceLanguage,
          targetLanguage,
          status: LearningStatus.SAVED,
          masteryScore: 0.0,
          priorityScore: 0.0,
          intervalDays: 1,
          easeFactor: 2.5,
          nextReviewAt: new Date(),
        });
      }
    } catch (err: any) {
      console.error(`❌ Failed to parse ${file}:`, err.message);
    }
  }

  // Step 5: Bulk insert unique items into database
  if (toInsert.length > 0) {
    console.log(`\n⏳ Inserting ${toInsert.length} unique words into database...`);
    const result = await prisma.userVocabulary.createMany({
      data: toInsert,
      skipDuplicates: true,
    });
    console.log(`✅ Inserted ${result.count} words successfully!`);
  } else {
    console.log('\nℹ️ No new words to insert (all items already exist in database or were duplicates).');
  }

  // Step 6: Summary Report
  console.log('\n======================================================');
  console.log('📊 Seeding Summary Report');
  console.log('======================================================');
  console.log(`📥 Total words loaded from files:  ${totalInputCount}`);
  console.log(`🔄 Duplicate words within files:    ${skippedBatchDuplicates} (skipped)`);
  console.log(`⚡ Already existed in database:    ${skippedDbDuplicates} (skipped)`);
  console.log(`✨ Newly added to database:        ${toInsert.length}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding process error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
