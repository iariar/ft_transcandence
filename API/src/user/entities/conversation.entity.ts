import { JoinTable, Entity, PrimaryGeneratedColumn, ManyToMany, OneToMany, Column, OneToOne, JoinColumn } from 'typeorm';
import { Message } from './message.entity';
import { UserEntity } from './user.entity'

@Entity()
export class Convo {
	@PrimaryGeneratedColumn()
	id: number;

	// @OneToOne(() => UserEntity)
	// @JoinColumn()
	// owner: UserEntity

	@Column({ default: false, nullable: true })
	private: boolean

	@Column({ unique: true, nullable: true })
	description: string

	@Column({ nullable: true })
	password: string

	@ManyToMany(() => UserEntity, (user) => user.id)
	@JoinTable()
	administrators: UserEntity[];

	@ManyToMany(() => UserEntity, (user) => user.id)
	@JoinTable()
	users: UserEntity[];


	@ManyToMany(type => UserEntity, (user) => user.id)
	@JoinTable({ joinColumn: {} })
	banned: UserEntity[];

	@ManyToMany(type => UserEntity)
	@JoinTable({ joinColumn: {} })
	muted: UserEntity[];

	@OneToMany(type => Message, (messages) => messages.convo)
	messages: Message[];

}
