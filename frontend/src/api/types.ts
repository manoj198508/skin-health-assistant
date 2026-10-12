export type ConversationMode = "chat" | "photo";

export type MessageType = "text" | "assessment" | "image";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  message_type: MessageType;
  created_at: string;
}

export interface Conversation {
  id: string;
  mode: ConversationMode;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export type CareUrgency = "routine" | "soon" | "urgent";

export interface PhotoAssessment {
  visible_observations: string[];
  possible_conditions: string[];
  explanation: string;
  general_information: string;
  self_care: string[];
  precautions: string[];
  when_to_see_doctor: string[];
  care_urgency: CareUrgency;
  confidence_and_limitations: string;
}

export interface PhotoAnalysisResponse {
  conversation_id: string;
  image_id: string;
  assessment: PhotoAssessment;
  assistant_message: Message;
}

export interface MessageCreateResponse {
  user_message: Message;
  assistant_message: Message;
}
