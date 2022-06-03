import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinTable, OneToMany, Column, OneToOne, JoinColumn } from 'typeorm';

@Entity()
export class Message {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true })
	content: string

	@Column({ nullable: true })
	sender: string

	// @ManyToOne(() => Convo, (convo) => convo.messages)
	// convo: Convo

}