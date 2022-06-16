import { OneToMany, ManyToOne, JoinTable, Entity, ManyToMany, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import AVatar from './file.entity';
import { Match } from './match.entity';
import { UserStats } from './stats.entity';
import { Convo } from '../../chat/entities/conversation.entity';

@Entity()
export class UserEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true, unique: true })
	username: string;

	@Column({ unique: true, nullable: true })
	login: string;

	@Column({ unique: true, nullable: true })
	email: string;

	@Column({ nullable: true, default: false })
	twoFaActivated: boolean;

	@Column({ nullable: true, default: false })
	email_confirmed: boolean;

	@Column({ default: "uploads/profileImages/Screen Shot 2022-03-24 at 5.20.58 PM.png" })
	imagePath: string

	@OneToOne(() => UserStats, { cascade: true })
	@JoinColumn()
	userstats: UserStats

	@ManyToMany(type => UserEntity, (user) => user.friends)
	@JoinTable({ joinColumn: {} })
	friends: UserEntity[];

	@ManyToMany(type => UserEntity, (user) => user.blocked)
	@JoinTable({ joinColumn: {} })
	blocked: UserEntity[];

	@Column({ default: false })
	isEmailConfirmed: boolean;

	@ManyToMany(type => Convo)
	@JoinTable()
	rooms: Convo[];

	@ManyToMany(() => Convo, (album) => album.administrators)
	convo_administrators: Convo[]


	@ManyToMany(() => Match)
	@JoinTable({ joinColumn: {} })
	history: Match[]


}