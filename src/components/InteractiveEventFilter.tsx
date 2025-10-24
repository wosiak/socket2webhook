import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import type { EventFilter } from '../types';

// Placeholder components for icons
const Filter = ({ className }: { className?: string }) => <span className={className}>🔍</span>;
const Plus = ({ className }: { className?: string }) => <span className={className}>➕</span>;
const Trash2 = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;
const Settings = ({ className }: { className?: string }) => <span className={className}>⚙️</span>;
const MousePointer2 = ({ className }: { className?: string }) => <span className={className}>👆</span>;
const Code = ({ className }: { className?: string }) => <span className={className}>💻</span>;

interface InteractiveEventFilterProps {
  eventName: string;
  eventDisplayName: string;
  filters: EventFilter[];
  onFiltersChange: (filters: EventFilter[]) => void;
}

const OPERATOR_LABELS = {
  equals: 'Igual a',
  not_equals: 'Diferente de',
  greater_than: 'Maior que',
  less_than: 'Menor que',
  contains: 'Contém',
  not_contains: 'Não contém'
};

// Estruturas de exemplo dos eventos
const SAMPLE_EVENT_BODIES = {
  "call-history-was-created": {
    "callHistory": {
      "number": "5582988628425",
      "campaign": {
        "id": 201074,
        "name": "Campanha 1"
      },
      "company": {
        "id": 1,
        "name": "Empresa 1"
      },
      "mailing_data": {
        "_id": "Abc123",
        "identifier": "Abc123",
        "campaign_id": 1,
        "company_id": 1,
        "list_id": 1,
        "uf": "PR",
        "phone": "5542999998888",
        "dialed_phone": 1,
        "dialed_identifier": 1,
        "on_calling": 0,
        "column_position": 8,
        "row_position": 81,
        "cpf": "Abc123",
        "data": {},
        "dialed_identifier_today": {
          "count": 1,
          "last_day": 1757559600
        },
        "retry_strategy": {
          "id": 280832,
          "applied_default_strategy": false,
          "hangup_cause_group_code": 3,
          "hangup_cause_group_description": "amd",
          "qualification_id": 0,
          "attempts": 1,
          "interval": 50,
          "conclude_number": true,
          "next_call": 1757611990,
          "last_update": {
            "from_list_id": 2945394,
            "from_mailing_id": "68c2e1738464e8454a1c06f2",
            "date": "2025-09-11 13:43:10"
          }
        }
      },
      "phone_type": "mobile",
      "agent": {
        "id": 0,
        "name": null
      },
      "route": {
        "id": 1,
        "name": "Rota",
        "host": "0.0.0.0:0",
        "route": "1",
        "endpoint": "teste/teste/teste:",
        "caller_id": "1000000000"
      },
      "telephony_id": "Abc123",
      "status": 7,
      "qualification": {
        "id": 1,
        "name": "NOME",
        "behavior": null,
        "behavior_text": null,
        "conversion": null,
        "is_dmc": 0,
        "is_unknown": 0,
        "impact": null
      },
      "billed_time": 0,
      "billed_value": 0,
      "rate_value": 0,
      "dial_code": 0,
      "amd_status": null,
      "hangup_cause": 52,
      "recorded": true,
      "ended_by_agent": false,
      "ivr_after_call_time": 0,
      "qualification_note": "",
      "sid": "",
      "call_mode": "ura",
      "list": {
        "id": 1,
        "name": "Lista.csv",
        "original_name": ""
      },
      "call_date": "2025-09-11T16:42:49.000000Z",
      "calling_time": 17,
      "waiting_time": 0,
      "speaking_time": 0,
      "amd_time": 0,
      "speaking_with_agent_time": 0,
      "acw_time": 0,
      "ivr_after_call": false,
      "criteria": null,
      "ura_time": 0,
      "ivr_digit_pressed": "",
      "teams": [],
      "max_time_exceeded": 0,
      "updated_at": "2025-09-11T16:43:10.043000Z",
      "created_at": "2025-09-11T16:43:10.043000Z",
      "_id": "68c2fc1ea67a7c48af28ee91"
    },
    "hangupCause": {
      "text": "Outgoing calls barred",
      "color": "#686868",
      "id": 52,
      "sip": "CANCEL / 487"
    },
    "qualificationList": {
      "id": 1,
      "name": "Vendas",
      "company_id": 1,
      "created_at": "2024-04-22T14:11:34.000000Z",
      "updated_at": "2025-07-03T16:50:39.000000Z",
      "type": 1,
      "deleted_at": null,
      "behavior_overwriten_call": 3,
      "behavior_not_qualified": 3,
      "behavior_voice_message": 3,
      "behavior_mute_call": 3,
      "behavior_acw_timeout": 3
    },
    "webhookEvent": null,
    "bootTime": "2025-09-11T16:43:10.067661+00:00"
  },
  "new-message-whatsapp": {
    "chat": {
      "id": 3044525,
      "name": "Wosiak | Corporativo | Integrações",
      "protocol_number": null,
      "contact": {
        "id": 2889649,
        "name": "554299958417",
        "name_alias": null,
        "image": "null",
        "is_blocked": false,
        "company_id": 8673,
        "number": "5542999958417"
      },
      "instance_id": "3d36bf80421332c8d09b0c6fd574cce4",
      "instance": {
        "id": "3d36bf80421332c8d09b0c6fd574cce4",
        "name": "Automação / Integração",
        "team_id": 7649,
        "company_id": 8673,
        "group_channel_id": 3777,
        "open_ai": false,
        "status": "connected",
        "first_connection": false,
        "type": "z-api",
        "phone": "554299958417"
      },
      "number": "5542999958417",
      "team_id": 7649,
      "last_message": "teste",
      "last_message_data": {
        "body": "teste",
        "type": "chat",
        "date": 1756151722,
        "send_by_me": true
      },
      "internal_message": {
        "client_initiated_chat": false,
        "agent_name": "Eduardo Wosiak",
        "message": "Conversa aceita por: Eduardo Wosiak"
      },
      "company_id": 8673,
      "agent_id": 114880,
      "agent": {
        "id": 114880,
        "name": "Eduardo Wosiak",
        "extension": {
          "id": 158893,
          "extension_number": 1001,
          "type": "user",
          "company_id": 8673,
          "created_at": "2024-08-29 13:10:20",
          "updated_at": "2024-08-29 13:10:20"
        },
        "role": {
          "id": 2,
          "name": "manager",
          "created_at": "2018-06-28 11:58:40",
          "updated_at": "2018-06-28 11:58:40",
          "pivot": {
            "user_id": 114880,
            "role_id": 2
          }
        },
        "teams": []
      },
      "unread": 0,
      "quantity_of_messages": 1,
      "finished": false,
      "type": "chat",
      "from_me": true,
      "group_owner": null,
      "allow_all_agents": false,
      "is_read_only": false,
      "time": null,
      "oldest_unanswered_message_date": 1755869444,
      "is_group": false,
      "most_older_unanswered_message": 1755869444,
      "most_older_received_message": 1756151722,
      "transferred": false,
      "transfered_from_group_channel_id": null,
      "lag_to_response": {
        "response_is_late": false,
        "late_since": null,
        "max_time_to_be_answer": null
      },
      "queue_response_is_late": {
        "response_is_late": false,
        "late_since": null,
        "max_time_waiting_agent_answer": 0
      },
      "waba_message_received": {
        "sended_message_template": false,
        "message_received": false,
        "end_message_cycle": null
      },
      "chatbot_id": null,
      "chatbot": {
        "is_active": false,
        "last_action_id": null,
        "start_chatbot": null
      },
      "updated_at": "2025-08-25T19:55:22.000000Z",
      "created_at": "2025-06-23T12:04:29.000000Z",
      "end_snooze": 1756151722,
      "in_snooze": false,
      "message_from": null,
      "contact_tags": [],
      "color": "#111111",
      "mood": null,
      "by_active_ivr": false,
      "is_trigger_chat": false,
      "messages": [],
      "from_trigger": false
    },
    "message": {
      "id": "3EB0AB81F51873B8F78329",
      "internal_id": "3EB0AB81F51873B8F78329",
      "message_from": "554299958417",
      "number": "5542999958417",
      "type": "chat",
      "body": "teste",
      "instance_id": "3d36bf80421332c8d09b0c6fd574cce4",
      "instance": {
        "id": "3d36bf80421332c8d09b0c6fd574cce4",
        "name": "Automação / Integração",
        "team_id": 7649,
        "company_id": 8673,
        "group_channel_id": 3777,
        "open_ai": false,
        "status": "connected",
        "first_connection": false,
        "type": "z-api",
        "phone": "554299958417"
      },
      "chat_id": "3044525",
      "agent_id": null,
      "agent": [],
      "time_whatsapp": 1756151722,
      "time": 1756151722,
      "audio_transcription": null,
      "from": "554299958417",
      "to": "554299958417",
      "author": "Eduardo Wosiak",
      "ack": "device",
      "media": null,
      "media_name": "",
      "media_original_name": null,
      "size": 0,
      "fromMe": true,
      "self": true,
      "isForwarded": false,
      "isMentioned": false,
      "is_deleted": false,
      "is_external": true,
      "quoted_msg": {
        "body": null,
        "id": null,
        "media": null,
        "type": null
      },
      "reference_id": "3EB0AB81F51873B8F78329",
      "from_chatbot": false,
      "waba_template_data": null,
      "inter_message_data": null,
      "internal": null,
      "index_order": 118,
      "is_deleted_at": null,
      "context": "historic",
      "page": null,
      "button_response": null,
      "buttons": []
    }
  },
  "call-was-created": {
    "call": {
      "mailing_id": "123abc",
      "phone": "5542999889988",
      "identifier": "000.000.000-15",
      "campaign_id": 1,
      "company_id": 1,
      "call_mode": "dialer",
      "campaign_group_id": 0,
      "id": "call:01:01:ABC123",
      "telephony_id": "ABC123",
      "filter_calls": 1,
      "route_id": 1,
      "status": 1,
      "dialed_time": 1756152158
    },
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-25T20:02:38.604780+00:00"
  },
  "call-is-trying": {
    "call": {
      "mailing_id": "123abc",
      "phone": "5542999889988",
      "identifier": "000.000.000-15",
      "campaign_id": 1,
      "company_id": 1,
      "call_mode": "dialer",
      "campaign_group_id": 0,
      "id": "call:01:01:ABC123",
      "telephony_id": "ABC123",
      "filter_calls": 1,
      "route_id": 14147,
      "status": 1,
      "dialed_time": 1756152158
    },
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-25T20:02:38.596113+00:00"
  },
  "call-was-abandoned": {
    "call": {
      "mailing_id": "123abc",
      "phone": "5542999889988",
      "identifier": "000.000.000-15",
      "campaign_id": 1,
      "company_id": 1,
      "call_mode": "dialer",
      "campaign_group_id": 0,
      "id": "call:01:01:ABC123",
      "telephony_id": "ABC123",
      "filter_calls": "1",
      "route_id": "14147",
      "status": "6",
      "dialed_time": "1756152132",
      "answered_time": "1756152149",
      "amd_status": "0",
      "amd_time": "1756152152",
      "hangup_cause": "16",
      "hangup_cause_txt": "Normal clearing",
      "hangup_cause_color": "#5CB85C",
      "hangup_time": "1756152158"
    },
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-25T20:02:38.971833+00:00"
  },
  "new-agent-message-whatsapp": {
    "chat": {
      "id": 1,
      "name": null,
      "protocol_number": null,
      "contact": {
        "id": 1,
        "name": "Nome do Contato",
        "name_alias": "Nome do Contato",
        "image": null,
        "is_blocked": false,
        "company_id": 1,
        "number": "5542998359999"
      },
      "instance_id": "Abc123",
      "instance": {
        "id": "Abc123",
        "name": "Automação / Integração",
        "team_id": 7649,
        "company_id": 1,
        "group_channel_id": 3777,
        "open_ai": false,
        "status": "connected",
        "first_connection": false,
        "type": "z-api",
        "phone": "554299959999"
      },
      "number": "5542998359999",
      "team_id": 7649,
      "last_message": "teste",
      "last_message_data": {
        "body": "teste",
        "type": "chat",
        "date": 1761325688,
        "send_by_me": true
      },
      "internal_message": {
        "client_initiated_chat": true,
        "agent_name": "Wosiak - 1",
        "message": "Conversa aceita por: Wosiak - 1 - 24-10-2025 14:08:06"
      },
      "company_id": 1,
      "agent_id": 114885,
      "agent": {
        "id": 114885,
        "name": "Wosiak - 1",
        "extension": {
          "id": 158898,
          "extension_number": 11,
          "type": "user",
          "company_id": 1,
          "created_at": "2024-08-29 13:20:32",
          "updated_at": "2024-08-29 13:20:32"
        },
        "role": {
          "id": 3,
          "name": "agent",
          "created_at": "2018-06-28 11:58:40",
          "updated_at": "2018-06-28 11:58:40",
          "pivot": {
            "user_id": 114885,
            "role_id": 3
          }
        },
        "teams": [
          {
            "id": 7649,
            "name": "Equipe 1",
            "color": "#111111",
            "company_id": 1,
            "created_at": "2024-08-29 13:23:30",
            "updated_at": "2024-08-29 13:41:27",
            "whatsapp": true,
            "qualification_list_id": 14850,
            "whatsapp_quick_message_list_id": null,
            "pivot": {
              "user_id": 114885,
              "team_id": 7649
            }
          }
        ]
      },
      "unread": 0,
      "quantity_of_messages": 1,
      "finished": false,
      "type": "chat",
      "from_me": true,
      "group_owner": null,
      "allow_all_agents": false,
      "is_read_only": false,
      "time": null,
      "oldest_unanswered_message_date": 1761325688,
      "is_group": false,
      "most_older_unanswered_message": 1761325688,
      "most_older_received_message": 1761325688,
      "transferred": false,
      "transfered_from_group_channel_id": null,
      "lag_to_response": {
        "response_is_late": false,
        "late_since": null,
        "max_time_to_be_answer": null
      },
      "queue_response_is_late": {
        "response_is_late": false,
        "late_since": null,
        "max_time_waiting_agent_answer": 0
      },
      "waba_message_received": {
        "sended_message_template": false,
        "message_received": false,
        "end_message_cycle": null
      },
      "chatbot_id": null,
      "chatbot": {
        "is_active": false,
        "last_action_id": null,
        "start_chatbot": null
      },
      "updated_at": "2025-10-24T17:08:08.000000Z",
      "created_at": "2025-10-14T16:57:49.000000Z",
      "end_snooze": 1761325688,
      "in_snooze": false,
      "message_from": null,
      "contact_tags": [
        {
          "id": 8678,
          "name": "Ajuste",
          "color": "#E8E8E8",
          "company_id": 1,
          "created_at": "2025-10-24 13:04:25",
          "updated_at": "2025-10-24 13:04:25",
          "pivot": {
            "contact_id": 1,
            "tag_id": 8678
          }
        },
        {
          "id": 8637,
          "name": "Desenvolvimento",
          "color": "#FFF6BF",
          "company_id": 1,
          "created_at": "2025-10-23 11:51:01",
          "updated_at": "2025-10-23 11:51:01",
          "pivot": {
            "contact_id": 1,
            "tag_id": 8637
          }
        }
      ],
      "color": "#111111",
      "mood": null,
      "by_active_ivr": false,
      "is_trigger_chat": false,
      "messages": [],
      "from_trigger": true
    },
    "message": {
      "id": "3EB0EF5EE1173528C097BE",
      "internal_id": "true_5542998359225@c_3777_1761325688_03523526-b0fc-11f0-9249-6e0fe047d31c",
      "message_from": "Wosiak - 1",
      "number": "5542998359225",
      "type": "chat",
      "body": "teste",
      "instance_id": "Abc123",
      "instance": {
        "id": "Abc123",
        "name": "Automação / Integração",
        "team_id": 7649,
        "company_id": 1,
        "group_channel_id": 3777,
        "open_ai": false,
        "status": "connected",
        "first_connection": false,
        "type": "z-api",
        "phone": "554299958417"
      },
      "chat_id": 1,
      "agent_id": 1,
      "agent": {
        "id": 114885,
        "name": "Wosiak - 1",
        "extension": {
          "id": 158898,
          "extension_number": 11,
          "type": "user",
          "company_id": 1,
          "created_at": "2024-08-29 13:20:32",
          "updated_at": "2024-08-29 13:20:32"
        },
        "role": {
          "id": 3,
          "name": "agent",
          "created_at": "2018-06-28 11:58:40",
          "updated_at": "2018-06-28 11:58:40",
          "pivot": {
            "user_id": 114885,
            "role_id": 3
          }
        },
        "teams": [
          {
            "id": 7649,
            "name": "Equipe 1",
            "color": "#111111",
            "company_id": 1,
            "created_at": "2024-08-29 13:23:30",
            "updated_at": "2024-08-29 13:41:27",
            "whatsapp": true,
            "qualification_list_id": 14850,
            "whatsapp_quick_message_list_id": null,
            "pivot": {
              "user_id": 114885,
              "team_id": 7649
            }
          }
        ]
      },
      "time_whatsapp": 1761325688,
      "time": 1761325688,
      "audio_transcription": null,
      "from": "554299958417",
      "to": "5542998359999",
      "author": "Wosiak - 1",
      "ack": null,
      "media": null,
      "media_name": null,
      "media_original_name": null,
      "size": 0,
      "fromMe": true,
      "self": false,
      "isForwarded": false,
      "isMentioned": false,
      "is_deleted": false,
      "is_external": false,
      "quoted_msg": {
        "body": null,
        "id": null,
        "media": null,
        "type": null
      },
      "reference_id": null,
      "from_chatbot": false,
      "waba_template_data": null,
      "inter_message_data": null,
      "internal": false,
      "index_order": 406,
      "is_deleted_at": null,
      "context": "historic",
      "page": null,
      "button_response": [],
      "buttons": []
    }
  },
  "new-whatsapp-internal-message": {
    "chat": {
      "id": 1,
      "name": null,
      "protocol_number": null,
      "contact": {
        "id": 123,
        "name": "Nome do Contato",
        "name_alias": null,
        "image": null,
        "is_blocked": false,
        "company_id": 1,
        "number": "5542999889988"
      },
      "instance_id": "abc123",
      "instance": {
        "id": "abc123",
        "name": "Nome da Instância",
        "team_id": 1,
        "company_id": 1,
        "group_channel_id": 1,
        "open_ai": false,
        "status": "connected",
        "first_connection": false,
        "type": "z-api",
        "phone": "5542900000000"
      },
      "number": "5542999889988",
      "team_id": 1,
      "last_message": null,
      "last_message_data": {
        "body": null,
        "type": null,
        "date": 1756154216,
        "send_by_me": false
      },
      "internal_message": {
        "client_initiated_chat": false,
        "agent_name": "Nome do Agente",
        "message": "Conversa aceita por: Nome do Agente"
      },
      "company_id": 1,
      "agent_id": 1,
      "agent": {
        "id": 1,
        "name": "Nome do Agente",
        "extension": {
          "id": 1,
          "extension_number": 1,
          "type": "user",
          "company_id": 1,
          "created_at": "2024-08-29 13:20:32",
          "updated_at": "2024-08-29 13:20:32"
        },
        "role": {
          "id": 3,
          "name": "agent",
          "created_at": "2018-06-28 11:58:40",
          "updated_at": "2018-06-28 11:58:40",
          "pivot": {
            "user_id": 1,
            "role_id": 3
          }
        },
        "teams": [
          {
            "id": 1,
            "name": "Equipe 1",
            "color": "#111111",
            "company_id": 1,
            "created_at": "2024-08-29 13:23:30",
            "updated_at": "2024-08-29 13:41:27",
            "whatsapp": true,
            "qualification_list_id": 1,
            "whatsapp_quick_message_list_id": null,
            "pivot": {
              "user_id": 1,
              "team_id": 1
            }
          }
        ]
      },
      "unread": 0,
      "quantity_of_messages": null,
      "finished": false,
      "type": "chat",
      "from_me": true,
      "group_owner": null,
      "allow_all_agents": false,
      "is_read_only": false,
      "time": null,
      "oldest_unanswered_message_date": 1756154216,
      "is_group": false,
      "most_older_unanswered_message": 1756154216,
      "most_older_received_message": 1756154216,
      "transferred": false,
      "transfered_from_group_channel_id": null,
      "lag_to_response": {
        "response_is_late": false,
        "late_since": null,
        "max_time_to_be_answer": 0
      },
      "queue_response_is_late": {
        "response_is_late": false,
        "late_since": null,
        "max_time_waiting_agent_answer": 0
      },
      "waba_message_received": {
        "sended_message_template": false,
        "message_received": false,
        "end_message_cycle": null
      },
      "chatbot_id": null,
      "chatbot": {
        "is_active": false,
        "last_action_id": null,
        "start_chatbot": null
      },
      "updated_at": "2025-08-25T20:36:56.000000Z",
      "created_at": "2025-06-25T12:18:33.000000Z",
      "end_snooze": 1756154216,
      "in_snooze": false,
      "message_from": null,
      "contact_tags": [],
      "color": "#111111",
      "mood": null,
      "by_active_ivr": false,
      "is_trigger_chat": false,
      "messages": [],
      "from_trigger": false
    },
    "message": {
      "id": "internal_protocol-message_3069146_1756154216_3e02f7b0-81f3-11f0-95ca-ea414a0f0a71",
      "internal_id": "internal_protocol-message_3069146_1756154216_3e02f7b0-81f3-11f0-95ca-ea414a0f0a71",
      "message_from": null,
      "number": "5542999889988",
      "type": "protocol-message",
      "body": "Protocolo do Atendimento: 1",
      "instance_id": "abc123",
      "instance": {
        "id": "abc123",
        "name": "Nome da Instância",
        "team_id": 1,
        "company_id": 1,
        "group_channel_id": 1,
        "open_ai": false,
        "status": "connected",
        "first_connection": false,
        "type": "z-api",
        "phone": "5542999889988"
      },
      "chat_id": "01",
      "agent_id": 1,
      "agent": {
        "id": 1,
        "name": "Nome do Agente",
        "extension": {
          "id": 1,
          "extension_number": 1,
          "type": "user",
          "company_id": 1,
          "created_at": "2024-08-29 13:20:32",
          "updated_at": "2024-08-29 13:20:32"
        },
        "role": {
          "id": 3,
          "name": "agent",
          "created_at": "2018-06-28 11:58:40",
          "updated_at": "2018-06-28 11:58:40",
          "pivot": {
            "user_id": 1,
            "role_id": 3
          }
        },
        "teams": [
          {
            "id": 1,
            "name": "Equipe 1",
            "color": "#111111",
            "company_id": 1,
            "created_at": "2024-08-29 13:23:30",
            "updated_at": "2024-08-29 13:41:27",
            "whatsapp": true,
            "qualification_list_id": 1,
            "whatsapp_quick_message_list_id": null,
            "pivot": {
              "user_id": 1,
              "team_id": 1
            }
          }
        ]
      },
      "time_whatsapp": 1756154216,
      "time": 1756154216,
      "audio_transcription": null,
      "from": "5542900000000",
      "to": "5542999889988",
      "author": null,
      "ack": null,
      "media": null,
      "media_name": null,
      "media_original_name": null,
      "size": 0,
      "fromMe": false,
      "self": false,
      "isForwarded": false,
      "isMentioned": false,
      "is_deleted": false,
      "is_external": false,
      "quoted_msg": {
        "body": null,
        "id": null,
        "media": null,
        "type": null
      },
      "reference_id": null,
      "from_chatbot": false,
      "waba_template_data": null,
      "inter_message_data": null,
      "internal": null,
      "index_order": 7,
      "is_deleted_at": null,
      "context": "historic",
      "page": null,
      "button_response": [],
      "buttons": []
    }
  },
  "call-was-connected": {
    "agent": {
      "id": 1,
      "name": "Nome do Operador | 3C Plus",
      "email": null,
      "active": true,
      "telephony_id": "SzIcGT2KCo",
      "api_token": "3OKBM5ggEDztXjigA16ZPa3Beo9xm6ghYGAvJC6dCbRdPs177PJZY9RYjbnd",
      "confirmed": true,
      "company_id": 1,
      "extension_password": "Po5G27ps4M",
      "extension_id": 214655,
      "last_login": "2025-08-26 19:08:03",
      "extension_number": 30,
      "type": "agent",
      "webphone": false,
      "extension": {
        "id": 214655,
        "extension_number": 30,
        "type": "user",
        "company_id": 1
      },
      "agent_status": {
        "id": 240093,
        "status": 2,
        "call": "Abc123",
        "logged_campaign": 1,
        "start_idleness": 1756235702,
        "status_start_time": 1756235737,
        "user_id": 1,
        "call_mode": "dialer",
        "connected_time": 1756235737
      },
      "roles": [
        {
          "id": 3,
          "name": "agent",
          "pivot": {
            "user_id": 1,
            "role_id": 3
          }
        }
      ]
    },
    "agentStatus": 2,
    "call": {
      "mailing_id": "68ae07cbad3b8763ac74fcb3",
      "phone": "5542999958417",
      "identifier": "68ae07cb4e58e9.17690272",
      "campaign_id": 1,
      "company_id": 1,
      "call_mode": "dialer",
      "campaign_group_id": 0,
      "id": "call:1:1:Abc123",
      "telephony_id": "Abc123",
      "filter_calls": "1",
      "route_id": "12766",
      "status": "3",
      "dialed_time": "1756235723",
      "answered_time": "1756235734",
      "connected_time": "1756235737",
      "agent": "1",
      "agent_idleness": "35",
      "sid": "2025082616153701"
    },
    "campaign": {
      "id": 1,
      "queue_id": null,
      "name": "Nome da Campanha",
      "start_time": "11:00:00",
      "end_time": "21:30:00",
      "paused": false,
      "company_id": 1,
      "check_amd": true,
      "route_landline_id": 12766,
      "route_mobile_id": 12766,
      "acw_timeout": 0,
      "caller_id": "1000000000",
      "asr": "0.1",
      "allows_manual": true,
      "is_predictive": false,
      "recording_enabled": true,
      "filter_calls": true,
      "horizontal_dial": false,
      "distribution_type": "teams_and_agents",
      "hide_phone": false,
      "is_on_active_time": true
    },
    "campaignId": 1,
    "campaignGroupId": 0,
    "mailing": {
      "_id": "68ae07cbad3b8763ac74fcb3",
      "identifier": "68ae07cb4e58e9.17690272",
      "campaign_id": 1,
      "company_id": 1,
      "list_id": 2886308,
      "uf": "PR",
      "phone": "5542999958417",
      "dialed_phone": 1,
      "dialed_identifier": 1,
      "column_position": 2,
      "row_position": 2,
      "data": {
        "Identificador": "11",
        "Nome": "Corporativo",
        "Bairro": "2K",
        "Data Nasc": "14-06-2005"
      },
      "type": "dialer"
    },
    "qualification": {
      "qualifications": [],
      "url": ""
    },
    "queues": [],
    "ringGroups": [],
    "schedule": null,
    "userExtensionStatus": null,
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-26T19:15:37.405987+00:00"
  },
  "mailing-list-was-finished": {
    "mailingList": {
      "id": 1,
      "name": "Nome da Lista.csv",
      "original_name": "",
      "file": "mailing/Abc123.1234567890",
      "company_id": 8673,
      "created_at": "2025-08-26T19:12:39.000000Z",
      "updated_at": "2025-08-26T19:12:39.000000Z",
      "campaign_id": 200737,
      "deleted_at": null,
      "dial": 0,
      "redial": 0,
      "abandoned": 0,
      "answered": 0,
      "total": 0,
      "weight": 0,
      "callback": false,
      "dialed": 0,
      "importing": false,
      "converted": 0,
      "failed": 0,
      "abandoned_due_amd": 0,
      "dmc": 0,
      "ura_id": null,
      "should_notify": true,
      "recycled_time": 0,
      "recycle_source_list_id": null,
      "recycle_process": false,
      "recycle_filters": [],
      "unknown": 0,
      "pro_mode": true,
      "conversion_goal": 0,
      "next_call_at": null,
      "batch_id": null,
      "recycling_progress_percentage": 0,
      "headers": [],
      "qualification_id": null,
      "asr": 0,
      "completed": 0,
      "completed_percentage": 0,
      "asr_percentage": 0,
      "answered_percentage": 0,
      "dial_percentage": 0,
      "redial_percentage": 0,
      "converted_percentage": 0,
      "dmc_percentage": 0,
      "unknown_percentage": 0,
      "company": {
        "id": 1,
        "name": "Wosiak",
        "domain": "wosiak",
        "currency": "BRL",
        "balance": "1000.00000000000",
        "is_partner": false,
        "route_landline_id": 12766,
        "route_mobile_id": 12766,
        "max_agents_login": 5,
        "caller_id": null,
        "logo_name": "",
        "logo_image_link": "",
        "credit_limit": "0",
        "socket_channel": "Abc123",
        "integration_enabled": true,
        "partner_id": null,
        "webphone_licenses": 0,
        "deleted_at": null,
        "ura_licenses": 100,
        "low_balance_reported": false,
        "webphone_only": false,
        "limit_call_per_agent": "30",
        "access_bi": false,
        "credit_sms": 0,
        "value_sms": "0.06",
        "route_group_landline_id": null,
        "route_group_mobile_id": null,
        "limit_unproductive_calls": 0,
        "plan": 2,
        "new_front_end": true,
        "whatsapp_licenses": 10,
        "url": null,
        "original_block_date": 1754449200,
        "blocked_at": 1786147199,
        "blocked_sms": false,
        "stereo_audio_enabled": true,
        "used_3c_plus_route": false,
        "whatsapp_max_concurrent_logins": 4,
        "enabled_download_audios_in_batch": true,
        "pro_mode": true,
        "webhook_integration": true,
        "record_audio_agent": false,
        "two_factor": false,
        "two_factor_interval_days": 30,
        "two_factor_setup_deadline": "2025-02-12 00:00:00",
        "ai_call_evaluation": true,
        "state_dial_exception": "",
        "international_route_id": null,
        "international_route_group_id": null,
        "ring_group_licenses": 10,
        "pabx": true,
        "plan_tax_id": null,
        "extra_balance": "0.00",
        "report_in_html_format": false,
        "mailing_list_conversion_goals": false,
        "ai_chat_evaluation": true,
        "group_channel_ids": "[\"1839\"]",
        "criterion_list_id": 16567,
        "reserved_balance": "0.00",
        "trigger_sms_value": "0.059",
        "trigger_waba_value": "0",
        "trigger_whatsapp_3c_value": "0",
        "trigger_ivr_dmc_value": "0.05",
        "trigger_ivr_dmc_available_channels": 9,
        "trigger_ivr_dmc_licenses": 40,
        "is_allowed_to_call": true,
        "balance_to_call": 1000.00000000000,
        "licenses": 5
      }
    },
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-26T19:12:39.818999+00:00"
  },
  "agent-was-logged-out": {
    "agent": {
      "id": 168205,
      "name": "Nome do Operador | 3C Plus",
      "email": null,
      "active": true,
      "telephony_id": "SzIcGT2KCo",
      "api_token": "TokenDoOperador",
      "confirmed": true,
      "confirmation_code": null,
      "company_id": 1,
      "extension_password": "Abc123",
      "extension_id": 214655,
      "user_document": null,
      "last_login": "2025-08-26 19:08:03",
      "type": "agent",
      "webphone": false,
      "agent_status": {
        "id": 240093,
        "status": 0,
        "call": "",
        "logged_campaign": null,
        "start_idleness": 1756235410,
        "status_start_time": 1756235465,
        "user_id": 168205,
        "start_manual": 1756235466,
        "start_manual_acw": 1756235466,
        "webphone": false,
        "call_mode": null,
        "connected_time": null,
        "logged_group": null,
        "campaign_group": null
      },
      "extension": {
        "id": 214655,
        "extension_number": 30,
        "type": "user",
        "company_id": 1
      },
      "receptive_queues": [],
      "roles": [
        {
          "id": 3,
          "name": "agent",
          "pivot": {
            "user_id": 168205,
            "role_id": 3
          }
        }
      ]
    },
    "agent_campaign": null,
    "campaign_group_id": null,
    "agent_team": [],
    "login_time": "26/08/2025 16:08:23",
    "logout_time": "26/08/2025 16:11:05",
    "queues": [],
    "socket": null
  },
  "agent-is-idle": {
    "agent": {
      "id": 1,
      "status": 1,
      "status_in_ring_group": null,
      "extension_number": 30
    },
    "queues": [],
    "campaignId": 1,
    "campaignGroupId": null,
    "ring_groups": [],
    "socket": null
  },
  "agent-entered-manual": {
    "agent": {
      "id": 168205,
      "name": "Nome do Operador | 3C Plus",
      "email": null,
      "active": true,
      "telephony_id": "SzIcGT2KCo",
      "api_token": "TokendoOperador",
      "confirmed": true,
      "confirmation_code": null,
      "company_id": 1,
      "extension_password": "Abc123",
      "extension_id": 214655,
      "user_document": null,
      "last_login": "2025-08-26 19:08:03",
      "type": "agent",
      "webphone": false,
      "roles": [
        {
          "id": 3,
          "name": "agent",
          "pivot": {
            "user_id": 168205,
            "role_id": 3
          }
        }
      ],
      "settings": {
        "id": 168204,
        "timezone": "America/Sao_Paulo",
        "language": "pt-br",
        "user_id": 168205,
        "hour_format": "H:i:s",
        "date_format": "d/m/Y",
        "web_extension": true,
        "sector": null,
        "access": null
      },
      "agent_status": {
        "id": 240093,
        "status": 4,
        "call": null,
        "logged_campaign": 200737,
        "start_idleness": 1756235303,
        "status_start_time": 1756235309,
        "user_id": 168205,
        "start_manual": 1756235309,
        "start_manual_acw": 1756235312,
        "webphone": false,
        "call_mode": null,
        "connected_time": null,
        "logged_group": null
      },
      "user_extension_status": null,
      "extension": {
        "id": 214655,
        "extension_number": 30,
        "type": "user",
        "company_id": 1
      },
      "receptive_queues": [],
      "ring_groups": []
    },
    "agentStatus": 4,
    "campaignId": 200737,
    "campaignGroupId": null,
    "queues": [],
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-26T19:08:29.825775+00:00"
  },
  "start-snooze-chat-whatsapp": {
    "chat": {
      "id": 1,
      "name": null,
      "protocol_number": null,
      "contact": {
        "id": 2839924,
        "name": "Eduardo Wosiak",
        "name_alias": null,
        "image": "https://pps.whatsapp.net/v/t61.24694-24/491867791_686211294351958_8713257708430176031_n.jpg?ccb=11-4&oh=01_Q5Aa1wFkx_cdViCpsh0rIbqf9ZXVB_XlvgJcL4qRsTnucaYSMQ&oe=686BD59C&_nc_sid=5e03e0&_nc_cat=106",
        "is_blocked": false,
        "company_id": 1,
        "number": "5542999998888"
      },
      "instance_id": "abc123",
      "instance": {
        "id": "abc123",
        "name": "Nome do Grupo de Canal",
        "team_id": 7649,
        "company_id": 1,
        "group_channel_id": 3777,
        "open_ai": false,
        "status": "connected",
        "first_connection": false,
        "type": "z-api",
        "phone": "5542988889999"
      },
      "number": "5542999998888",
      "team_id": 7649,
      "last_message": "Última mensagem",
      "last_message_data": {
        "body": "Última mensagem",
        "type": "chat",
        "date": 1756230834,
        "send_by_me": true
      },
      "internal_message": {
        "client_initiated_chat": false,
        "agent_name": "Nome do Operador",
        "message": "Conversa aceita por: Nome do Operador"
      },
      "company_id": 1,
      "agent_id": 114885,
      "agent": {
        "id": 114885,
        "name": "Nome do Operador",
        "extension": {
          "id": 158898,
          "extension_number": 11,
          "type": "user",
          "company_id": 1,
          "created_at": "2024-08-29 13:20:32",
          "updated_at": "2024-08-29 13:20:32"
        },
        "role": {
          "id": 3,
          "name": "agent",
          "created_at": "2018-06-28 11:58:40",
          "updated_at": "2018-06-28 11:58:40",
          "pivot": {
            "user_id": 114885,
            "role_id": 3
          }
        },
        "teams": [
          {
            "id": 7649,
            "name": "Equipe 1",
            "color": "#111111",
            "company_id": 1,
            "created_at": "2024-08-29 13:23:30",
            "updated_at": "2024-08-29 13:41:27",
            "whatsapp": true,
            "qualification_list_id": 14850,
            "whatsapp_quick_message_list_id": null,
            "pivot": {
              "user_id": 114885,
              "team_id": 7649
            }
          }
        ]
      },
      "unread": 8,
      "quantity_of_messages": 1,
      "finished": false,
      "type": "chat",
      "from_me": true,
      "group_owner": null,
      "allow_all_agents": false,
      "is_read_only": false,
      "time": null,
      "oldest_unanswered_message_date": 1756237646,
      "is_group": false,
      "most_older_unanswered_message": 1756237646,
      "most_older_received_message": 1756237646,
      "transferred": false,
      "transfered_from_group_channel_id": null,
      "lag_to_response": {
        "response_is_late": false,
        "late_since": null,
        "max_time_to_be_answer": 0
      },
      "queue_response_is_late": {
        "response_is_late": false,
        "late_since": null,
        "max_time_waiting_agent_answer": 0
      },
      "waba_message_received": {
        "sended_message_template": false,
        "message_received": false,
        "end_message_cycle": null
      },
      "chatbot_id": null,
      "chatbot": {
        "is_active": false,
        "last_action_id": null,
        "start_chatbot": null
      },
      "updated_at": "2025-08-26T19:47:26.000000Z",
      "created_at": "2025-06-11T20:33:31.000000Z",
      "end_snooze": 1756248420,
      "in_snooze": true,
      "message_from": null,
      "contact_tags": [],
      "color": "#111111",
      "mood": null,
      "by_active_ivr": false,
      "is_trigger_chat": false,
      "messages": [],
      "from_trigger": false
    }
  },
  "finish-chat": {
    "chat": {
      "id": 2980117,
      "agent_id": 114885,
      "contact_id": 2839924,
      "team_id": 7649,
      "company_id": 1,
      "chatbot_id": null,
      "created_at": "2025-06-11 17:33:31",
      "updated_at": "2025-08-26 16:50:31",
      "deleted_at": null,
      "group_channel_id": 3777,
      "oldest_unanswered_message_date": null,
      "unread": 8,
      "type": "chat",
      "number": "5542999998888",
      "from_me": true,
      "is_group": false,
      "quantity_of_messages": 1,
      "finished": true,
      "most_older_unanswered_message": null,
      "last_message_body": "(11) 93932-0521",
      "last_message_date": "2025-08-26 14:53:54",
      "last_message_send_by_me": true,
      "most_older_received_message": null,
      "in_snooze": false,
      "end_snooze": null,
      "lag_to_response_is_late": false,
      "lag_to_response_late_since": null,
      "lag_to_response_max_time_to_be_answer": 0,
      "queue_response_is_late": false,
      "queue_response_late_since": null,
      "queue_response_max_time_to_be_answer": 0,
      "internal_message_client_initiated_chat": false,
      "internal_message_agent_name": "Wosiak - 1",
      "internal_message_body": "Conversa aceita por: Wosiak - 1",
      "transferred": false,
      "protocol_number": null,
      "sid": null,
      "response_is_late": false,
      "waba_message_received": false,
      "waba_message_received_sended_message_template": false,
      "waba_message_received_end_message_cycle": null,
      "message_from": null,
      "check_ack_job_scheduled": false,
      "group_owner": null,
      "name": null,
      "group_updated_at": null,
      "is_read_only": false,
      "allow_all_agents": false,
      "quantity_of_messages_to_evaluate": 13,
      "mood": null,
      "by_active_ivr": false,
      "agent_first_answer": "1753104990",
      "last_message_type": "chat",
      "last_instance_id": "3d36bf80421332c8d09b0c6fd574cce4",
      "transferred_from_group_channel_id": 3777,
      "group_channel": {
        "id": 3777,
        "name": "Automação / Integração",
        "company_id": 1,
        "team_id": 7649,
        "deleted_at": null,
        "created_at": "2025-06-11 15:30:22",
        "updated_at": "2025-08-14 17:43:02",
        "openai_status": false,
        "openai_context": null,
        "status": "active",
        "color": "#111111",
        "sequential_last_received_chat_user_id": null,
        "chat_distribution_strategy": "BALANCED",
        "sequential_last_chat_datetime": null,
        "is_chatbot_enabled": false,
        "audio_transcription_enabled": false,
        "external_device_chat_enabled": false,
        "company": {
          "id": 1,
          "name": "Wosiak",
          "domain": "wosiak",
          "currency": "BRL",
          "balance": "906.6450000000002",
          "created_at": "2024-08-29 13:10:20",
          "updated_at": "2025-08-22 09:59:49",
          "is_partner": false,
          "route_landline_id": 12766,
          "route_mobile_id": 12766,
          "max_agents_login": 5,
          "caller_id": null,
          "logo_name": "",
          "logo_image_link": "",
          "credit_limit": "0",
          "socket_channel": "Abc123",
          "integration_enabled": true,
          "partner_id": null,
          "webphone_licenses": 0,
          "deleted_at": null,
          "ura_licenses": 100,
          "low_balance_reported": false,
          "webphone_only": false,
          "limit_call_per_agent": "30",
          "access_bi": false,
          "credit_sms": 0,
          "value_sms": "0.06",
          "route_group_landline_id": null,
          "route_group_mobile_id": null,
          "limit_unproductive_calls": 0,
          "plan": 2,
          "new_front_end": true,
          "whatsapp_licenses": 10,
          "url": null,
          "original_block_date": 1754449200,
          "blocked_at": 1786147199,
          "blocked_sms": false,
          "stereo_audio_enabled": true,
          "used_3c_plus_route": false,
          "whatsapp_max_concurrent_logins": 4,
          "enabled_download_audios_in_batch": true,
          "pro_mode": true,
          "webhook_integration": true,
          "record_audio_agent": false,
          "two_factor": false,
          "two_factor_interval_days": 30,
          "two_factor_setup_deadline": "2025-02-12 00:00:00",
          "ai_call_evaluation": true,
          "state_dial_exception": "",
          "international_route_id": null,
          "international_route_group_id": null,
          "ring_group_licenses": 10,
          "pabx": true,
          "plan_tax_id": null,
          "extra_balance": "0.00",
          "report_in_html_format": false,
          "mailing_list_conversion_goals": false,
          "ai_chat_evaluation": true,
          "group_channel_ids": "[\"1839\"]",
          "criterion_list_id": 16567,
          "reserved_balance": "0.00",
          "trigger_sms_value": "0.059",
          "trigger_waba_value": "0",
          "trigger_whatsapp_3c_value": "0",
          "trigger_ivr_dmc_value": "0.05",
          "trigger_ivr_dmc_available_channels": 9,
          "trigger_ivr_dmc_licenses": 40
        }
      },
      "last_instance": {
        "id": "abc123",
        "ultramsg_id": null,
        "name": "Automação / Integração",
        "token": null,
        "company_id": 1,
        "team_id": 7649,
        "status": "connected",
        "first_connection": false,
        "phone": "554299958417",
        "group_channel_id": 3777,
        "deleted_at": null,
        "created_at": "2025-06-11 15:31:27",
        "updated_at": "2025-08-02 00:01:26",
        "type": "z-api",
        "phone_number_id": null,
        "waba_token": null,
        "whatsapp_business_account_id": null,
        "page_token": null,
        "page_id": null,
        "expiration_date": "2025-09-01 23:59:59",
        "disconnected_at": null,
        "z_api_id": "ABC123",
        "z_api_token": "ABC123",
        "group_channel": {
          "id": 3777,
          "name": "Automação / Integração",
          "company_id": 1,
          "team_id": 7649,
          "deleted_at": null,
          "created_at": "2025-06-11 15:30:22",
          "updated_at": "2025-08-14 17:43:02",
          "openai_status": false,
          "openai_context": null,
          "status": "active",
          "color": "#111111",
          "sequential_last_received_chat_user_id": null,
          "chat_distribution_strategy": "BALANCED",
          "sequential_last_chat_datetime": null,
          "is_chatbot_enabled": false,
          "audio_transcription_enabled": false,
          "external_device_chat_enabled": false
        }
      },
      "contact": {
        "id": 2839924,
        "name": "Eduardo Wosiak",
        "name_alias": null,
        "image": "https://pps.whatsapp.net/v/t61.24694-24/491867791_686211294351958_8713257708430176031_n.jpg?ccb=11-4&oh=01_Q5Aa1wFkx_cdViCpsh0rIbqf9ZXVB_XlvgJcL4qRsTnucaYSMQ&oe=686BD59C&_nc_sid=5e03e0&_nc_cat=106",
        "company_id": 1,
        "created_at": "2025-06-11 17:33:31",
        "updated_at": "2025-08-26 14:53:54",
        "deleted_at": null,
        "is_blocked": false,
        "tags": []
      },
      "user": {
        "id": 114885,
        "name": "Wosiak - 1",
        "email": null,
        "active": true,
        "telephony_id": "j2XiRPafUl",
        "api_token": "Abc123",
        "confirmed": true,
        "confirmation_code": null,
        "company_id": 1,
        "created_at": "2024-08-29 13:20:33",
        "updated_at": "2025-08-26 15:29:31",
        "extension_password": "CcF1mmd6Ne",
        "extension_id": 158898,
        "user_document": "",
        "last_login": "2025-08-26 18:29:31",
        "frontend": "new",
        "frontend_updated_at": "2024-12-02 17:21:54",
        "last_active_at": null,
        "password_updated_at": "2024-08-29 13:21:52",
        "two_factor_secret": null
      },
      "team": {
        "id": 7649,
        "name": "Equipe 1",
        "color": "#111111",
        "company_id": 1,
        "created_at": "2024-08-29 13:23:30",
        "updated_at": "2024-08-29 13:41:27",
        "whatsapp": true,
        "qualification_list_id": 14850,
        "whatsapp_quick_message_list_id": null
      },
      "protocol": {
        "id": 8802563,
        "agent_id": 114885,
        "old_chat_id": null,
        "protocol_number": "1750853988188",
        "agent_name": "Wosiak - 1",
        "start_time": "1750853988",
        "end_time": "1753206752",
        "created_at": "2025-06-25 09:19:48",
        "updated_at": "2025-07-22 14:52:32",
        "qualification_id": -2,
        "qualification_note": "",
        "instance_id": "abc123",
        "provider": "z-api",
        "transfer_count": 0,
        "chat_id": 2980117,
        "transferred_at": null,
        "trigger_id": null,
        "trigger_reference": null
      }
    },
    "chatDetails": {
      "agent_name": "Wosiak - 1",
      "queue_start": null,
      "team_name": "Equipe 1",
      "group_channel_name": "Automação / Integração",
      "qualification": {
        "id": -2,
        "name": "Não qualificada",
        "color": "#ababab",
        "list_id": null
      },
      "finished_at": 1756237831
    }
  },
  "transfer-chat-whatsapp": {
    "data": {
      "message": {
        "id": "internal_transfer_3044525_1756238078_7f4fd6e8-82b6-11f0-acfa-e229d52079df",
        "internal_id": "internal_transfer_3044525_1756238078_7f4fd6e8-82b6-11f0-acfa-e229d52079df",
        "message_from": null,
        "number": "5542999998888",
        "type": "transfer",
        "body": null,
        "instance_id": "abc123",
        "instance": {
          "id": "abc123",
          "name": "Automação / Integração",
          "team_id": 7649,
          "company_id": 1,
          "group_channel_id": 3777,
          "open_ai": false,
          "status": "connected",
          "first_connection": false,
          "type": "z-api",
          "phone": "5542999998888"
        },
        "chat_id": "3044525",
        "agent_id": 114880,
        "agent": {
          "id": 114880,
          "name": "Eduardo Wosiak",
          "extension": {
            "id": 158893,
            "extension_number": 1001,
            "type": "user",
            "company_id": 1,
            "created_at": "2024-08-29 13:10:20",
            "updated_at": "2024-08-29 13:10:20"
          },
          "role": {
            "id": 2,
            "name": "manager",
            "created_at": "2018-06-28 11:58:40",
            "updated_at": "2018-06-28 11:58:40",
            "pivot": {
              "user_id": 114880,
              "role_id": 2
            }
          },
          "teams": []
        },
        "time_whatsapp": 1756238078,
        "time": 1756238078,
        "audio_transcription": null,
        "from": "5542999998888",
        "to": "5542999998888",
        "author": null,
        "ack": null,
        "media": null,
        "media_name": null,
        "media_original_name": null,
        "size": 0,
        "fromMe": false,
        "self": false,
        "isForwarded": false,
        "isMentioned": false,
        "is_deleted": false,
        "is_external": false,
        "quoted_msg": {
          "body": null,
          "id": null,
          "media": null,
          "type": null
        },
        "reference_id": null,
        "from_chatbot": false,
        "waba_template_data": null,
        "inter_message_data": {
          "previous_agent": {
            "id": 114880,
            "name": "Eduardo Wosiak"
          },
          "current_agent": {
            "id": 114885,
            "name": "Wosiak - 1"
          }
        },
        "internal": null,
        "index_order": 120,
        "is_deleted_at": null,
        "context": "historic",
        "page": null,
        "button_response": [],
        "buttons": []
      },
      "chat": {
        "id": 3044525,
        "name": "Wosiak | Corporativo | Integrações",
        "protocol_number": null,
        "contact": {
          "id": 2889649,
          "name": "5542999998888",
          "name_alias": null,
          "image": "null",
          "is_blocked": false,
          "company_id": 1,
          "number": "5542999998888"
        },
        "instance_id": "Abc123",
        "instance": {
          "id": "Abc123",
          "name": "Automação / Integração",
          "team_id": 7649,
          "company_id": 1,
          "group_channel_id": 3777,
          "open_ai": false,
          "status": "connected",
          "first_connection": false,
          "type": "z-api",
          "phone": "5542999998888"
        },
        "number": "5542999998888",
        "team_id": 7649,
        "last_message": "(51) 99206-1713",
        "last_message_data": {
          "body": "(51) 99206-1713",
          "type": "chat",
          "date": 1756156240,
          "send_by_me": true
        },
        "internal_message": {
          "client_initiated_chat": false,
          "agent_name": "Eduardo Wosiak",
          "message": "Conversa aceita por: Eduardo Wosiak"
        },
        "company_id": 1,
        "agent_id": 114885,
        "agent": {
          "id": 114885,
          "name": "Wosiak - 1",
          "extension": {
            "id": 158898,
            "extension_number": 11,
            "type": "user",
            "company_id": 1,
            "created_at": "2024-08-29 13:20:32",
            "updated_at": "2024-08-29 13:20:32"
          },
          "role": {
            "id": 3,
            "name": "agent",
            "created_at": "2018-06-28 11:58:40",
            "updated_at": "2018-06-28 11:58:40",
            "pivot": {
              "user_id": 114885,
              "role_id": 3
            }
          },
          "teams": [
            {
              "id": 7649,
              "name": "Equipe 1",
              "color": "#111111",
              "company_id": 1,
              "created_at": "2024-08-29 13:23:30",
              "updated_at": "2024-08-29 13:41:27",
              "whatsapp": true,
              "qualification_list_id": 14850,
              "whatsapp_quick_message_list_id": null,
              "pivot": {
                "user_id": 114885,
                "team_id": 7649
              }
            }
          ]
        },
        "unread": 0,
        "quantity_of_messages": 1,
        "finished": false,
        "type": "chat",
        "from_me": true,
        "group_owner": null,
        "allow_all_agents": false,
        "is_read_only": false,
        "time": null,
        "oldest_unanswered_message_date": 1755869444,
        "is_group": false,
        "most_older_unanswered_message": 1755869444,
        "most_older_received_message": 1756238078,
        "transferred": true,
        "transfered_from_group_channel_id": null,
        "lag_to_response": {
          "response_is_late": false,
          "late_since": null,
          "max_time_to_be_answer": null
        },
        "queue_response_is_late": {
          "response_is_late": false,
          "late_since": null,
          "max_time_waiting_agent_answer": 0
        },
        "waba_message_received": {
          "sended_message_template": false,
          "message_received": false,
          "end_message_cycle": null
        },
        "chatbot_id": null,
        "chatbot": {
          "is_active": false,
          "last_action_id": null,
          "start_chatbot": null
        },
        "updated_at": "2025-08-26T19:54:37.000000Z",
        "created_at": "2025-06-23T12:04:29.000000Z",
        "end_snooze": 1756238078,
        "in_snooze": false,
        "message_from": null,
        "contact_tags": [],
        "color": "#111111",
        "mood": null,
        "by_active_ivr": false,
        "is_trigger_chat": false,
        "messages": [],
        "from_trigger": false
      },
      "agent_id": 114880,
      "instance_id": "Abc123",
      "team_id": 7649
    }
  },
  "new-agent-chat-whatsapp": {
    "chat": {
      "id": 3484812,
      "name": null,
      "protocol_number": null,
      "contact": {
        "id": 3247798,
        "name": "5542999998888",
        "name_alias": null,
        "image": null,
        "is_blocked": false,
        "company_id": 1,
        "number": "5542999998888"
      },
      "instance_id": "Abc123",
      "instance": {
        "id": "Abc123",
        "name": "Automação / Integração",
        "team_id": 7649,
        "company_id": 1,
        "group_channel_id": 3777,
        "open_ai": false,
        "status": "connected",
        "first_connection": false,
        "type": "z-api",
        "phone": "5542999998888"
      },
      "number": "5542999998888",
      "team_id": 7649,
      "last_message": null,
      "last_message_data": {
        "body": null,
        "type": null,
        "date": 1756239954,
        "send_by_me": false
      },
      "internal_message": {
        "client_initiated_chat": false,
        "agent_name": "Eduardo Wosiak",
        "message": "Conversa iniciada pelo agente Eduardo Wosiak"
      },
      "company_id": 1,
      "agent_id": 114880,
      "agent": {
        "id": 114880,
        "name": "Eduardo Wosiak",
        "extension": {
          "id": 158893,
          "extension_number": 1001,
          "type": "user",
          "company_id": 1,
          "created_at": "2024-08-29 13:10:20",
          "updated_at": "2024-08-29 13:10:20"
        },
        "role": {
          "id": 2,
          "name": "manager",
          "created_at": "2018-06-28 11:58:40",
          "updated_at": "2018-06-28 11:58:40",
          "pivot": {
            "user_id": 114880,
            "role_id": 2
          }
        },
        "teams": []
      },
      "unread": 0,
      "quantity_of_messages": null,
      "finished": false,
      "type": "chat",
      "from_me": true,
      "group_owner": null,
      "allow_all_agents": false,
      "is_read_only": false,
      "time": null,
      "oldest_unanswered_message_date": 1756239954,
      "is_group": false,
      "most_older_unanswered_message": 1756239954,
      "most_older_received_message": 1756239954,
      "transferred": false,
      "transfered_from_group_channel_id": null,
      "lag_to_response": {
        "response_is_late": false,
        "late_since": null,
        "max_time_to_be_answer": 0
      },
      "queue_response_is_late": {
        "response_is_late": false,
        "late_since": null,
        "max_time_waiting_agent_answer": 0
      },
      "waba_message_received": {
        "sended_message_template": false,
        "message_received": false,
        "end_message_cycle": null
      },
      "chatbot_id": null,
      "chatbot": {
        "is_active": false,
        "last_action_id": null,
        "start_chatbot": null
      },
      "updated_at": "2025-08-26T20:25:54.000000Z",
      "created_at": "2025-08-26T20:25:54.000000Z",
      "end_snooze": 1756239954,
      "in_snooze": false,
      "message_from": null,
      "contact_tags": [],
      "color": "#111111",
      "mood": null,
      "by_active_ivr": null,
      "is_trigger_chat": false,
      "messages": [],
      "from_trigger": false
    }
  },
  "call-was-not-answered": {
    "call": {
      "mailing_id": "Abc123",
      "phone": "5542999998888",
      "identifier": "1",
      "campaign_id": 1,
      "company_id": 1,
      "call_mode": "dialer",
      "campaign_group_id": 0,
      "id": "call:1:1:Abc123",
      "telephony_id": "Abc123",
      "filter_calls": "1",
      "route_id": "5903",
      "status": "5",
      "dialed_time": "1756239505",
      "hangup_cause": "0",
      "hangup_cause_txt": "Unknown",
      "hangup_cause_color": "#8dc18d",
      "hangup_time": "1756239531"
    },
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-26T20:18:54.620050+00:00"
  },
  "call-was-amd": {
    "call": {
      "mailing_id": "Abc123",
      "phone": "5542999998888",
      "identifier": "1",
      "campaign_id": 1,
      "company_id": 1,
      "call_mode": "dialer",
      "campaign_group_id": 0,
      "id": "call:1:1:Abc123",
      "telephony_id": "Abc123",
      "filter_calls": "1",
      "route_id": "9391",
      "status": "2",
      "dialed_time": "1756239642",
      "answered_time": "1756239653",
      "amd_status": "0",
      "amd_time": "1756239656"
    },
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-26T20:20:57.595684+00:00"
  },
  "call-was-answered": {
    "call": {
      "mailing_id": "Abc123",
      "phone": "5542999998888",
      "identifier": "123",
      "campaign_id": 1,
      "company_id": 1,
      "call_mode": "dialer",
      "campaign_group_id": 0,
      "id": "call:1:1:Abc123",
      "telephony_id": "Abc123",
      "filter_calls": "1",
      "route_id": "13578",
      "status": "2",
      "dialed_time": "1756239503",
      "answered_time": "1756239514"
    },
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-26T20:18:35.690695+00:00"
  },
  "manual-call-was-qualified": {
    "user": {
      "id": 1,
      "name": "Wosiak - 1",
      "email": null,
      "active": true,
      "telephony_id": "Abc123",
      "api_token": "Abc123",
      "confirmed": true,
      "confirmation_code": null,
      "company_id": 8673,
      "created_at": "2024-08-29T16:20:33.000000Z",
      "updated_at": "2025-08-29T13:40:30.000000Z",
      "extension_password": "Abc123",
      "extension_id": 158898,
      "user_document": "",
      "last_login": "2025-08-29 13:40:30",
      "frontend": "new",
      "frontend_updated_at": "2024-12-02 17:21:54",
      "last_active_at": null,
      "password_updated_at": "2024-08-29 13:21:52",
      "two_factor_secret": null,
      "type": "agent",
      "webphone": false,
      "roles": [
        {
          "id": 3,
          "name": "agent",
          "created_at": "2018-06-28T14:58:40.000000Z",
          "updated_at": "2018-06-28T14:58:40.000000Z",
          "pivot": {
            "user_id": 1,
            "role_id": 3
          }
        }
      ]
    },
    "campaign": {
      "id": 1,
      "queue_id": null,
      "name": "Nome da Campanha",
      "start_time": "11:00:00",
      "end_time": "21:30:00",
      "paused": false,
      "company_id": 1,
      "extension_id": null,
      "deleted_at": null,
      "created_at": "2025-08-26T19:07:03.000000Z",
      "updated_at": "2025-08-26T19:20:14.000000Z",
      "check_amd": true,
      "route_landline_id": 12766,
      "route_mobile_id": 12766,
      "acw_timeout": 0,
      "caller_id": "1000000000",
      "asr": "0.25",
      "limit_call_per_agent": "0",
      "work_break_group_id": 8867,
      "allows_manual": true,
      "active_list_notify": false,
      "ura_limit": 0,
      "is_predictive": false,
      "avg_calling_time": null,
      "avg_speaking_time": null,
      "avg_acw_time": null,
      "recording_enabled": true,
      "limit_call_time": 0,
      "copy_identifier": false,
      "exit_manual_mode": 0,
      "ivr_after_call_id": null,
      "should_complete_failed_call": true,
      "filter_calls": true,
      "route_limit_exceeded": false,
      "route_group_landline_id": null,
      "route_group_mobile_id": null,
      "progress_amd_enabled": true,
      "update_mailing_data": false,
      "ivr_after_call_status": false,
      "behavior": "",
      "horizontal_dial": false,
      "min_idle_time": 0,
      "check_blacklist": true,
      "check_dnd": true,
      "check_ddd": false,
      "agent_dashboard": false,
      "ai_setting_id": null,
      "international_route_id": null,
      "international_route_group_id": null,
      "distribution_type": "teams_and_agents",
      "hide_phone": false,
      "is_on_active_time": true
    },
    "webhookEvent": {
      "should_dispatch_webhook": false,
      "webhook_urls": [],
      "company_id": null
    },
    "bootTime": "2025-08-29T13:41:40.019844+00:00"
  },
  "manual-call-was-updated": {
    "callHistory": {
      "_id": "Abc123",
      "number": "5542999998888",
      "campaign": {
        "id": 1,
        "name": "Nome da Campanha"
      },
      "company": {
        "id": 1,
        "name": "Nome da Empresa"
      },
      "mailing_data": null,
      "phone_type": "mobile",
      "agent": {
        "id": 1,
        "name": "Wosiak - 1"
      },
      "route": {
        "id": 1,
        "name": "3C Plus ITX | Ilimitado ",
        "host": "34.139.235.7:1",
        "route": "1",
        "endpoint": "PJSIP/3cplus_next2/sip:",
        "caller_id": "1000000000"
      },
      "telephony_id": "Abc123",
      "status": 7,
      "qualification": {
        "id": -4,
        "name": "Mudo",
        "behavior": 3,
        "behavior_text": "repeat",
        "conversion": false,
        "dmc": null,
        "unknown": null,
        "impact": "negative"
      },
      "billed_time": 30,
      "billed_value": 0.028,
      "rate_value": 0.055,
      "dial_code": 0,
      "amd_status": null,
      "hangup_cause": 16,
      "recorded": true,
      "ended_by_agent": true,
      "ivr_after_call_time": 0,
      "qualification_note": "",
      "sid": "20250829104112114885",
      "call_mode": "manual",
      "list": [],
      "call_date": "2025-08-29T13:41:12.000000Z",
      "calling_time": 12,
      "waiting_time": 0,
      "speaking_time": 4,
      "speaking_with_agent_time": 4,
      "acw_time": 0,
      "ivr_after_call": false,
      "criteria": null,
      "updated_at": "2025-08-29T13:41:39.732000Z",
      "created_at": "2025-08-29T13:41:32.779000Z"
    },
    "socket": null
  }
};

export function InteractiveEventFilter({ 
  eventName, 
  eventDisplayName, 
  filters, 
  onFiltersChange 
}: InteractiveEventFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<any>('');
  const [operator, setOperator] = useState<string>('equals');

  // Função recursiva para renderizar JSON de forma interativa
  const renderInteractiveJson = (obj: any, path: string = '', depth: number = 0): React.ReactNode => {
    if (obj === null) {
      return <span className="text-gray-500 italic">null</span>;
    }

    if (typeof obj === 'string') {
      return (
        <span 
          className="text-green-600 cursor-pointer hover:bg-green-200 px-1 py-0.5 rounded transition-colors border border-transparent hover:border-green-300"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 Clicou em string:', path, obj);
            handleFieldClick(path, obj);
          }}
          title={`Clique para filtrar por: ${path} = "${obj}"`}
        >
          "{obj}"
        </span>
      );
    }

    if (typeof obj === 'number') {
      return (
        <span 
          className="text-blue-600 cursor-pointer hover:bg-blue-200 px-1 py-0.5 rounded font-medium transition-colors border border-transparent hover:border-blue-300"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 Clicou em number:', path, obj);
            handleFieldClick(path, obj);
          }}
          title={`Clique para filtrar por: ${path} = ${obj}`}
        >
          {obj}
        </span>
      );
    }

    if (typeof obj === 'boolean') {
      return (
        <span 
          className="text-purple-600 cursor-pointer hover:bg-purple-200 px-1 py-0.5 rounded transition-colors border border-transparent hover:border-purple-300"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 Clicou em boolean:', path, obj);
            handleFieldClick(path, obj);
          }}
          title={`Clique para filtrar por: ${path} = ${obj}`}
        >
          {obj.toString()}
        </span>
      );
    }

    if (Array.isArray(obj)) {
      return (
        <div className={`${depth > 0 ? 'ml-4' : ''}`}>
          [
          {obj.map((item, index) => (
            <div key={index} className="ml-4">
              {renderInteractiveJson(item, `${path}[${index}]`, depth + 1)}
              {index < obj.length - 1 && ','}
            </div>
          ))}
          ]
        </div>
      );
    }

    if (typeof obj === 'object') {
      return (
        <div className={`${depth > 0 ? 'ml-4' : ''}`}>
          {'{'}
          {Object.entries(obj).map(([key, value], index, entries) => (
            <div key={key} className="ml-4">
              <span className="text-blue-800 font-medium">"{key}"</span>: {' '}
              {renderInteractiveJson(value, path ? `${path}.${key}` : key, depth + 1)}
              {index < entries.length - 1 && ','}
            </div>
          ))}
          {'}'}
        </div>
      );
    }

    return <span>{String(obj)}</span>;
  };

  const handleFieldClick = (path: string, value: any) => {
    console.log('🎯 handleFieldClick chamado:', { path, value, type: typeof value });
    
    // O path deve ser exatamente como chega do servidor, ex: callHistory.status
    // Não precisamos adicionar prefixos
    let finalPath = path;
    
    // Se o path contiver o prefixo do evento, remover
    if (path.includes('call-history-was-created.')) {
      finalPath = path.replace('call-history-was-created.', '');
    } else if (path.includes('new-message-whatsapp.')) {
      finalPath = path.replace('new-message-whatsapp.', '');
    } else if (path.includes('call-was-created.')) {
      finalPath = path.replace('call-was-created.', '');
    } else if (path.includes('call-is-trying.')) {
      finalPath = path.replace('call-is-trying.', '');
    } else if (path.includes('call-was-abandoned.')) {
      finalPath = path.replace('call-was-abandoned.', '');
    } else if (path.includes('call-was-connected.')) {
      finalPath = path.replace('call-was-connected.', '');
    } else if (path.includes('new-agent-message-whatsapp.')) {
      finalPath = path.replace('new-agent-message-whatsapp.', '');
    } else if (path.includes('new-whatsapp-internal-message.')) {
      finalPath = path.replace('new-whatsapp-internal-message.', '');
    } else if (path.includes('mailing-list-was-finished.')) {
      finalPath = path.replace('mailing-list-was-finished.', '');
    } else if (path.includes('agent-was-logged-out.')) {
      finalPath = path.replace('agent-was-logged-out.', '');
    } else if (path.includes('agent-is-idle.')) {
      finalPath = path.replace('agent-is-idle.', '');
    } else if (path.includes('agent-entered-manual.')) {
      finalPath = path.replace('agent-entered-manual.', '');
    } else if (path.includes('start-snooze-chat-whatsapp.')) {
      finalPath = path.replace('start-snooze-chat-whatsapp.', '');
    } else if (path.includes('finish-chat.')) {
      finalPath = path.replace('finish-chat.', '');
    } else if (path.includes('transfer-chat-whatsapp.')) {
      finalPath = path.replace('transfer-chat-whatsapp.', '');
    } else if (path.includes('new-agent-chat-whatsapp.')) {
      finalPath = path.replace('new-agent-chat-whatsapp.', '');
    } else if (path.includes('call-was-not-answered.')) {
      finalPath = path.replace('call-was-not-answered.', '');
    } else if (path.includes('call-was-amd.')) {
      finalPath = path.replace('call-was-amd.', '');
    } else if (path.includes('call-was-answered.')) {
      finalPath = path.replace('call-was-answered.', '');
    } else if (path.includes('manual-call-was-qualified.')) {
      finalPath = path.replace('manual-call-was-qualified.', '');
    } else if (path.includes('manual-call-was-updated.')) {
      finalPath = path.replace('manual-call-was-updated.', '');
    }
    
    console.log('🎯 Path final gerado:', finalPath);
    
    setSelectedPath(finalPath);
    setSelectedValue(value);
    
    // Determinar operador padrão baseado no tipo
    const defaultOperator = typeof value === 'number' ? 'equals' : 
                           typeof value === 'boolean' ? 'equals' : 
                           'contains';
    setOperator(defaultOperator);
    
    console.log('🎯 Filtro configurado:', { path: finalPath, value, operator: defaultOperator });
  };

  const addFilter = () => {
    if (!selectedPath || selectedValue === '') return;

    const newFilter: EventFilter = {
      field_path: selectedPath,
      operator: operator as EventFilter['operator'],
      value: selectedValue,
      description: `Filtrar ${selectedPath} ${OPERATOR_LABELS[operator as keyof typeof OPERATOR_LABELS]} ${selectedValue}`
    };

    const updatedFilters = [...filters, newFilter];
    onFiltersChange(updatedFilters);
    
    // Limpar seleção
    setSelectedPath('');
    setSelectedValue('');
  };

  const removeFilter = (index: number) => {
    const updatedFilters = filters.filter((_, i) => i !== index);
    onFiltersChange(updatedFilters);
  };

  const renderValueInput = () => {
    const fieldType = typeof selectedValue;
    
    if (fieldType === 'boolean') {
      return (
        <select
          value={selectedValue?.toString() || ''}
          onChange={(e) => setSelectedValue(e.target.value === 'true')}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Selecione...</option>
          <option value="true">Verdadeiro</option>
          <option value="false">Falso</option>
        </select>
      );
    }

    // Determinar se deve ser number baseado no operador também
    const isNumericOperation = ['greater_than', 'less_than'].includes(operator);
    const shouldBeNumber = fieldType === 'number' || isNumericOperation;
    
    return (
      <Input
        type={shouldBeNumber ? 'number' : 'text'}
        value={selectedValue?.toString() || ''}
        onChange={(e) => {
          let value = e.target.value;
          
          // Para operações numéricas, converter para número
          if (shouldBeNumber && value !== '') {
            const numValue = Number(value);
            setSelectedValue(isNaN(numValue) ? value : numValue);
          } else {
            setSelectedValue(value);
          }
        }}
        placeholder={
          shouldBeNumber ? 
            'Digite um número (ex: 10)...' : 
            fieldType === 'string' ? 
              'Digite o texto...' : 
              'Digite o valor...'
        }
        className="h-8 text-xs"
        step={shouldBeNumber ? "any" : undefined}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-2 h-8 px-2"
          title="Configurar filtros interativos para este evento"
        >
          <Filter className="w-3 h-3 mr-1" />
          Filtros
          {filters.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
              {filters.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="!fixed !top-[50%] !left-[50%] !z-50 !grid !translate-x-[-50%] !translate-y-[-50%] !gap-4 !rounded-lg !border !p-6 !shadow-lg !duration-200 !w-[80vw] !max-w-6xl !bg-white !max-h-[90vh] !overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Filtros Interativos - {eventDisplayName}
          </DialogTitle>
          <DialogDescription>
            Clique nos valores do evento abaixo para criar filtros automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Layout principal - Evento à esquerda, Filtros à direita */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Estrutura do Evento - 3/4 da largura */}
            <div className="xl:col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Estrutura do Evento
                    <MousePointer2 className="w-4 h-4 text-blue-600" />
                  </CardTitle>
                  <p className="text-xs text-gray-600">
                    Clique nos valores destacados para criar filtros automaticamente
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] w-full">
                    <pre className="text-sm leading-relaxed font-mono">
                      {renderInteractiveJson(SAMPLE_EVENT_BODIES[eventName as keyof typeof SAMPLE_EVENT_BODIES] || SAMPLE_EVENT_BODIES["call-history-was-created"])}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Configuração de Filtros - 1/4 da largura */}
            <div className="space-y-4">
            {/* Filtros existentes */}
            {filters.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Filtros Configurados</CardTitle>
                </CardHeader>
                <CardContent className={`space-y-2 ${filters.length > 4 ? 'max-h-[40vh] overflow-y-auto' : ''}`}>
                  {filters.map((filter, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded relative">
                      {/* Botão lixeira sempre no canto superior direito */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFilter(index)}
                        className="absolute top-2 right-2 h-5 w-5 p-0 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      
                      {/* Conteúdo do filtro com espaço reservado para a lixeira */}
                      <div className="pr-8 text-xs space-y-1">
                        <div className="break-words">
                          <span className="text-gray-500 font-medium">Campo:</span>
                          <br />
                          <code className="bg-gray-200 px-1 rounded text-xs break-all">
                            {filter.field_path}
                          </code>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {OPERATOR_LABELS[filter.operator]}
                          </Badge>
                          <code className="bg-blue-100 px-1 rounded text-xs break-all">
                            {filter.value?.toString()}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Adicionar novo filtro */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {selectedPath ? 'Configurar Filtro' : 'Clique em um valor ao lado'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedPath ? (
                  <>
                    <div>
                      <Label className="text-xs">Campo Selecionado</Label>
                      <Input
                        value={selectedPath}
                        readOnly
                        className="h-8 text-xs bg-gray-100"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Operador</Label>
                      <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="h-8 text-xs bg-white border border-input rounded-md px-3 py-2 hover:border-blue-500 hover:text-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs">Valor</Label>
                      {renderValueInput()}
                    </div>

                    <Button
                      onClick={addFilter}
                      disabled={!selectedPath || selectedValue === ''}
                      className="w-full h-8 text-xs"
                      size="sm"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar Filtro
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <MousePointer2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Clique em qualquer valor na estrutura do evento</p>
                    <p className="text-xs">para configurar um filtro automaticamente</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6"
            onClick={() => {
              // Aplicar filtros e fechar
              if (filters.length > 0) {
                onFiltersChange(filters);
              }
              setIsOpen(false);
            }}
          >
            Salvar Filtros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
