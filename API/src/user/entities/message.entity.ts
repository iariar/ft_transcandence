import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinTable, OneToMany, Column, OneToOne, JoinColumn } from 'typeorm';
import { Convo } from './conversation.entity';
import { UserEntity } from './user.entity';

@Entity()
export class Message {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	content: string
	
	@Column()
    sender: string

	@ManyToOne(() => Convo, (convo) => convo.messages)
	convo: Convo

}