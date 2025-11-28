// Social Memory Sharing Types

export interface UserConnection {
  id: string;
  requester_id: string;
  addressee_id: string;
  relationship_type: string;
  relationship_label: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
}

export interface MemoryShare {
  id: string;
  memory_id: string;
  sharer_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'change_requested';
  share_message: string | null;
  change_request_message: string | null;
  change_request_at: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

export interface MemoryPerspective {
  id: string;
  memory_id: string;
  user_id: string;
  perspective_text: string;
  perspective_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchUserResult {
  user_id: string;
  display_name: string | null;
  preferred_name: string | null;
  location: string | null;
  is_connected: boolean;
  connection_status: string | null;
}

export interface ConnectedUser {
  user_id: string;
  relationship_type: string;
  relationship_label: string | null;
}

export const RELATIONSHIP_TYPES = [
  { value: 'mom', label: 'Mom' },
  { value: 'dad', label: 'Dad' },
  { value: 'friend', label: 'Friend' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' },
] as const;
