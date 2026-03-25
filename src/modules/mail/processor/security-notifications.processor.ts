import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../service';

@Processor('security-notifications')
export class SecurityNotificationsProcessor extends WorkerHost {
    private readonly logger = new Logger(SecurityNotificationsProcessor.name);

    constructor(private readonly mailService: MailService) {
        super();
    }

    async process(job: Job<any>): Promise<void> {
        const { to, oldEmail, newEmail } = job.data;
        this.logger.log(`Processing security notification mail for ${to}`);

        try {
            await this.mailService.sendEmailChangeNotification(to, oldEmail, newEmail);
            this.logger.log(`Security notification sent successfully to ${to}`);
        } catch (error) {
            this.logger.error(
                `Failed to send security notification to ${to}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}
