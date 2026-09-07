import { Global, Module } from '@nestjs/common';
import { getDb } from './index';

export const DB = Symbol('DB');

@Global()
@Module({
  providers: [{ provide: DB, useFactory: () => getDb() }],
  exports: [DB],
})
export class DbModule {}
