import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../types';
import { askTicketAssistant } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TicketAssistant'>;
type Message = { role: 'user' | 'assistant'; text: string };

const starterQuestions = [
  'Où et quand part mon car ?',
  'Quel est mon siège ?',
  'Comment présenter mon QR code ?',
];

export default function TicketAssistantScreen({ navigation, route }: Props) {
  const { bookingId, reference } = route.params;
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'fallback' | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Bonjour. Je peux répondre aux questions sur le billet ${reference || `EVEX-${bookingId}`}.`,
    },
  ]);

  const send = async (value = question) => {
    const clean = value.trim();
    if (!clean || loading) return;
    setMessages((current) => [...current, { role: 'user', text: clean }]);
    setQuestion('');
    setLoading(true);
    try {
      const response = await askTicketAssistant(bookingId, clean);
      setProvider(response.provider);
      setMessages((current) => [...current, { role: 'assistant', text: response.answer }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Assistant indisponible pour le moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={23} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>ASSISTANT BILLET</Text>
          <Text style={styles.title}>{reference || `EVEX-${bookingId}`}</Text>
        </View>
        <View style={styles.sparkle}>
          <Ionicons name="sparkles" size={22} color={COLORS.white} />
        </View>
      </View>

      <ScrollView
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message, index) => (
          <View
            key={`${message.role}-${index}`}
            style={[
              styles.bubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {message.role === 'assistant' && (
              <Ionicons name="sparkles" size={17} color={COLORS.primary} />
            )}
            <Text
              style={[
                styles.bubbleText,
                message.role === 'user' && styles.userBubbleText,
              ]}
            >
              {message.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.thinking}>Je vérifie votre billet…</Text>
          </View>
        )}

        {messages.length <= 1 && (
          <View style={styles.suggestions}>
            {starterQuestions.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.suggestion}
                onPress={() => void send(item)}
              >
                <Text style={styles.suggestionText}>{item}</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {provider && (
          <Text style={styles.provider}>
            {provider === 'openai' ? 'Réponse IA sécurisée' : 'Réponse EVEX hors ligne'}
          </Text>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Posez une question sur ce billet…"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          multiline
          maxLength={500}
          onSubmitEditing={() => void send()}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!question.trim() || loading) && styles.sendDisabled]}
          onPress={() => void send()}
          disabled={!question.trim() || loading}
        >
          <Ionicons name="arrow-up" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F7FD' },
  header: {
    paddingTop: 56,
    paddingBottom: 22,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginHorizontal: 14 },
  eyebrow: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: COLORS.white, fontSize: 21, fontWeight: '800', marginTop: 3 },
  sparkle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: { flex: 1 },
  messagesContent: { padding: 18, paddingBottom: 28 },
  bubble: {
    maxWidth: '88%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#DDE8F7',
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  bubbleText: { flexShrink: 1, color: '#173153', fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: COLORS.white },
  thinking: { color: '#64748B', fontSize: 14 },
  suggestions: { gap: 9, marginTop: 6 },
  suggestion: {
    borderRadius: 16,
    backgroundColor: '#E8F1FF',
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionText: { color: '#174A9B', fontSize: 14, fontWeight: '700' },
  provider: { textAlign: 'center', color: '#94A3B8', fontSize: 11, marginTop: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 110,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0F172A',
    fontSize: 15,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
