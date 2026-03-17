import { z } from 'zod';
import { 
    groupSchema, 
    groupTypeSchema, 
    groupHierarchyInfoSchema, 
    messageSchema 
} from '@/lib/validation/schemas';

export type Group = z.infer<typeof groupSchema>;
export type GroupType = z.infer<typeof groupTypeSchema>;
export type GroupHierarchyInfo = z.infer<typeof groupHierarchyInfoSchema>;
export type GroupMessage = z.infer<typeof messageSchema>;
