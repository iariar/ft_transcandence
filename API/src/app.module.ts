import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './user/entities/match.entity';
import { UserStats } from './user/entities/stats.entity';
import { UserEntity } from './user/entities/user.entity';
import { UserModule } from './user/user.module';
import { HttpModule } from 'nestjs-http-promise';
import AVatar from './user/entities/file.entity';
import { AuthModule } from './Auth/auth.module';
import { appController } from './app.controller';
import { Convo } from './chat/entities/conversation.entity';
import { Message } from './chat/entities/message.entity';
import { ChatModule } from './chat/chat.module';
import { AppGateway } from './socket/socket.service';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
dotenv.config();

// to do call db envs from .env

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PG_HOST,
      port: 5432,
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DB,
      entities: [UserEntity, UserStats, Match, AVatar, Convo, Message],
      synchronize: true,
    }),
    UserModule,
    HttpModule,
    AuthModule,
    ChatModule,
    JwtModule.register({}),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
  providers: [
    AppGateway,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
