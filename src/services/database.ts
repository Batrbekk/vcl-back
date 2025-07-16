import { PrismaClient } from '../../generated/prisma';

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    console.log('📦 Database disconnected');
  }

  get client(): PrismaClient {
    return this.prisma;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    await this.disconnect();
  }
}

export const databaseService = new DatabaseService();
export const prisma = databaseService.client; 