import { Module } from "@nestjs/common";
import { BullModule } from '@nestjs/bullmq';
import { FirebaseModule } from "../firebase/firebase.module";
import { MailService } from "./service";
import { ForgotPasswordProcessor } from "./processor";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'forgot-password' },
    ),
    FirebaseModule,
  ],
  providers: [
    MailService,
    ForgotPasswordProcessor,
  ],
  exports: [MailService],
})
export class MailModule {}
