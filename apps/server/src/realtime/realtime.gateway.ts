import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/city' })
export class RealtimeGateway {
  @WebSocketServer() server: Server;
  @SubscribeMessage('problem:join') join(@ConnectedSocket() socket: Socket, @MessageBody() problemId: string) { void socket.join(`problem:${problemId}`); }
  emitProblem(problemId: string, event: string, data: unknown) { this.server.to(`problem:${problemId}`).emit(event, data); this.server.emit('problems:changed', { problemId }); }
  emitUser(userId: string, event: string, data: unknown) { this.server.to(`user:${userId}`).emit(event, data); }
}
