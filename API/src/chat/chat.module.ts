import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm'
import { Convo } from './entities/conversation.entity'
import { UserEntity } from '../user/entities/user.entity'
import { Message } from './entities/message.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Convo, UserEntity, Message])],
  providers: [ChatService],
  controllers: [ChatController]
})
export class ChatModule { }
