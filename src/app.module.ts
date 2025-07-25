import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { configDotenv } from 'dotenv';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ProfileModule } from './profile/profile.module';
import { TransactionModule } from './transaction/transaction.module';
import { CrewModule } from './crew/crew.module';
import { AdminModule } from './admin/admin.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
configDotenv()


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_DB),
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '30d' },
    }),
    AuthModule,
    ProfileModule,
    TransactionModule,
    CrewModule,
    AdminModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/files', // this is the public path e.g. http://localhost:3000/files/...
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
