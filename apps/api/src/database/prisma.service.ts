import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

export const DEFAULT_USER_ID = 'default-user';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    await this.ensureDefaultUser();
  }

  /**
   * Ensures default testing user exists so foreign key constraints on
   * user_vocabularies and exercise_attempts are always satisfied.
   */
  async ensureDefaultUser(userId: string = DEFAULT_USER_ID) {
    try {
      await this.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          name: userId === DEFAULT_USER_ID ? 'Default User' : 'User',
          role: 'USER',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to ensure user "${userId}" exists in database:`, error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

