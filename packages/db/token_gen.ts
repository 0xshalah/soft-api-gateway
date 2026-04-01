import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
const prisma = new PrismaClient();
async function main() {
  const token = randomBytes(32).toString('hex');
  const secretKey = `sk_live_${token}`;
  const prefix = secretKey.substring(0, 15);
  const hash = createHash('sha256').update(secretKey).digest('hex');
  const adminUser = await prisma.user.findFirst();
  await prisma.key.create({
    data: {
      name: 'Temp Manual Test Key',
      prefix: prefix,
      hash: hash,
      scopes: ['read', 'write', 'admin'],
      createdBy: adminUser ? adminUser.id : null,
    },
  });
  console.log("###_TEST_KEY_START_###");
  console.log(secretKey);
  console.log("###_TEST_KEY_END_###");
}
main().catch(console.error).finally(() => prisma.$disconnect());
