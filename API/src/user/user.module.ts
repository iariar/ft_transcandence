import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { UserStats } from './entities/stats.entity';
import { Match } from './entities/match.entity';
import AVatar from './entities/file.entity';
import { JwtModule } from '@nestjs/jwt';
import { matches } from 'class-validator';
import { Convo } from '../chat/entities/conversation.entity';
import { Message } from '../chat/entities/message.entity';
import { ChatService } from 'src/chat/chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Convo,
      UserEntity,
      UserStats,
      matches,
      AVatar,
      Message,
      Match,
    ]),
    JwtModule.register({}),
    HttpModule,
  ],
  controllers: [UserController],
  providers: [ConfigService, UserService, ChatService],
  exports: [UserService],
})
export class UserModule {}
