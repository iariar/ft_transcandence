import { Module, HttpService } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity';
// import { JtwGuard } from 'src/auth/guard';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { HttpModule } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config';
import { UserStats } from './entities/stats.entity';
import { Match } from './entities/match.entity';
import { MailerModule } from '@nestjs-modules/mailer';
import AVatar from './entities/file.entity';
import { JwtModule } from '@nestjs/jwt';
import { matches } from 'class-validator';
import { Convo } from '../chat/entities/conversation.entity';
import { Message } from '../chat/entities/message.entity';
import { ChatService } from 'src/chat/chat.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Convo, UserEntity, UserStats, matches, AVatar, Message, Match]),
    JwtModule.register({}),
    HttpModule,
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          service: 'gmail',
          auth: {
            type: "OAuth2",
            user: 'arisssimane@gmail.com',
          },
          defaults: {
            from: `"No Reply" arisssimane@gmail.com`,
          },
        }
      })
    }),

  ],
  controllers: [UserController],
  providers: [ConfigService, UserService, ChatService], exports: [UserService]
})
export class UserModule { }