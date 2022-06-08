import { Body, Controller, Get, Param, ParseIntPipe, Post, Render, Res, StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import { AppService } from './app.service';
import { UserService } from './user/user.service';
import { Response } from 'express';

@Controller()
export class appController {
}