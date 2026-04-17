import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  const result = await prisma.chapterChunk.deleteMany({});
  console.log(`Deleted ${result.count} ChapterChunk row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
