import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bullmq';
import { FirebaseModule } from "../firebase/firebase.module";
import { MailService } from "./service";
import { ForgotPasswordProcessor, TemporalCredentialsProcessor } from "./processor";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'forgot-password' },
      { name: 'temporal-credentials' }
    ),
    FirebaseModule,
  ],
  providers: [
    MailService,
    ForgotPasswordProcessor,
    TemporalCredentialsProcessor
  ],
  exports: [MailService],
})
export class MailModule {}
