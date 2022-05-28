import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './user/entities/match.entity';
import { UserStats } from './user/entities/stats.entity';
import { UserEntity } from './user/entities/user.entity';
import { UserModule } from './user/user.module';
import { HttpModule } from 'nestjs-http-promise'
import AVatar from './user/entities/file.entity';
import { AuthModule } from './Auth/auth.module';
import { appController } from './app.controller';
import { Convo } from './user/entities/conversation.entity';
import { Message } from './user/entities/message.entity';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot({
    type: 'postgres',
    host: '10.11.100.14',
    port: 35000,
    username: 'user',
    password: 'password',
    database: 'db',
    entities: [UserEntity, UserStats, Match, AVatar, Convo, Message],
    synchronize: true,
  }), UserModule, HttpModule, AuthModule, ChatModule],
  // controllers: [appController],
  // providers: [UserService],
})
export class AppModule { }
