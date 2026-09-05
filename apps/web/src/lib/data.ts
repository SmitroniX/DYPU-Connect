import { db } from './firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { cacheTag } from 'next/cache';
import { UserProfile } from '@/types/profile';
import { Group } from '@/types/groups';
import { resolveProfileImage } from './profileImage';

/**
 * Fetches a student profile by ID with caching.
 */
export async function getStudentProfile(studentId: string): Promise<UserProfile | null> {
    "use cache";
    cacheTag(`student-${studentId}`);

    try {
        const docRef = doc(db, 'students', studentId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            return {
                ...data,
                userId: docSnap.id,
                profileImage: resolveProfileImage(data.profileImage, data.email, data.name)
            };
        }
        return null;
    } catch (error) {
        console.error(`[getStudentProfile] Error fetching ${studentId}:`, error);
        return null;
    }
}

/**
 * Fetches group metadata by name with caching.
 */
export async function getGroupMetadata(groupName: string): Promise<Group | null> {
    "use cache";
    cacheTag(`group-${groupName}`);

    try {
        const q = query(collection(db, 'groups'), where('name', '==', groupName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            return {
                ...(docSnap.data() as Group),
                id: docSnap.id
            };
        }
        return null;
    } catch (error) {
        console.error(`[getGroupMetadata] Error fetching ${groupName}:`, error);
        return null;
    }
}

/**
 * Fetches all groups for a user field/year with caching.
 */
export async function getUserGroups(field: string, year: string): Promise<Group[]> {
    "use cache";
    cacheTag(`user-groups-${field}-${year}`);

    try {
        const q = query(
            collection(db, 'groups'), 
            where('targetAudience', 'in', ['all', field, year])
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            ...(doc.data() as Group),
            id: doc.id
        }));
    } catch (error) {
        console.error(`[getUserGroups] Error fetching groups for ${field}/${year}:`, error);
        return [];
    }
}
