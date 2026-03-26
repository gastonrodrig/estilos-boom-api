import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bullmq';
import { MailService } from "./service/mail.service";
import { ForgotPasswordProcessor, TemporalCredentialsProcessor, SecurityNotificationsProcessor } from "./processor";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'forgot-password' },
      { name: 'temporal-credentials' },
      { name: 'security-notifications' }
    ),
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
