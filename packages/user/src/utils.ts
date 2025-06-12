import { DBService } from '@replyguy/db';
import { FID_STATUS } from './types';

export async function checkFIDStatus(fid: number, db: DBService) {
    const { success, data } = await db.checkFIDStatus(fid);
    if (!success || !data) {
        return { success: false, status: FID_STATUS.NEW };
    }

    if (data.is_subscribed) {
        return { success: true, status: FID_STATUS.SUBSCRIBED };
    }

    return { success: true, status: FID_STATUS.EXIST };
} 