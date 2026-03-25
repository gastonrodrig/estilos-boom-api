import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bullmq';
import { FirebaseModule } from "../firebase/firebase.module";
import { MailService } from "./service";
import { ForgotPasswordProcessor, TemporalCredentialsProcessor, SecurityNotificationsProcessor } from "./processor";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'forgot-password' },
      { name: 'temporal-credentials' },
      { name: 'security-notifications' }
    ),
    FirebaseModule,
  ],
  providers: [
    MailService,
    ForgotPasswordProcessor,
    TemporalCredentialsProcessor,
    SecurityNotificationsProcessor
  ],
  exports: [MailService],
})
export class MailModule { }
