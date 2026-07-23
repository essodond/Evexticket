import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import {
  AISearchResponse,
  City,
  naturalTripSearch,
} from '../services/api';

interface Props {
  cities: City[];
  onResults: (response: AISearchResponse) => void;
}

export default function FloatingTravelAssistant({ cities, onResults }: Props) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<'openai' | 'fallback' | null>(null);
  const speechModuleRef = useRef<any>(null);
  const speechSubscriptionsRef = useRef<Array<{ remove: () => void }>>([]);

  const runSearch = useCallback(async (value: string) => {
    const clean = value.trim();
    if (clean.length < 3 || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await naturalTripSearch(clean);
      setProvider(response.provider);
      if (response.missing.length > 0) {
        setMessage(`Précisez ${response.missing.join(' et ')}.`);
        return;
      }
      onResults(response);
      setMessage(
        response.count > 0
          ? `${response.count} voyage(s) trouvé(s). Les résultats sont prêts.`
          : 'Aucun voyage ne correspond exactement. Essayez une autre date.'
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'La recherche assistée est momentanément indisponible.'
      );
    } finally {
      setLoading(false);
    }
  }, [loading, onResults]);

  const clearSpeechSubscriptions = useCallback(() => {
    speechSubscriptionsRef.current.forEach((subscription) => subscription.remove());
    speechSubscriptionsRef.current = [];
  }, []);

  useEffect(() => () => {
    speechModuleRef.current?.abort?.();
    clearSpeechSubscriptions();
  }, [clearSpeechSubscriptions]);

  const startListening = async () => {
    setMessage(null);
    try {
      // Chargement à la demande : la recherche texte reste utilisable dans Expo Go.
      // La voix nécessite un development build contenant le module natif.
      const speechPackage = await import('expo-speech-recognition');
      const speechModule = speechPackage.ExpoSpeechRecognitionModule;
      speechModuleRef.current = speechModule;
      if (!speechModule.isRecognitionAvailable()) {
        setMessage('La reconnaissance vocale n’est pas disponible sur ce téléphone.');
        return;
      }
      const permission = await speechModule.requestPermissionsAsync();
      if (!permission.granted) {
        setMessage('Le microphone et la reconnaissance vocale doivent être autorisés.');
        return;
      }

      clearSpeechSubscriptions();
      speechSubscriptionsRef.current = [
        speechModule.addListener('start', () => {
          setListening(true);
          setMessage('Je vous écoute…');
        }),
        speechModule.addListener('end', () => {
          setListening(false);
          clearSpeechSubscriptions();
        }),
        speechModule.addListener('result', (event: any) => {
          const transcript = event.results[0]?.transcript?.trim() || '';
          if (!transcript) return;
          setQuery(transcript);
          if (event.isFinal) {
            setListening(false);
            void runSearch(transcript);
          }
        }),
        speechModule.addListener('error', (event: any) => {
          if (event.error === 'aborted') return;
          setListening(false);
          const permissionError = ['not-allowed', 'service-not-allowed'].includes(event.error);
          setMessage(
            permissionError
              ? 'Autorisez le microphone et la reconnaissance vocale dans les réglages du téléphone.'
              : 'Je n’ai pas bien entendu. Réessayez ou écrivez votre recherche.'
          );
        }),
      ];

      speechModule.start({
        lang: 'fr-FR',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        contextualStrings: [
          ...cities.map((city) => city.name),
          'aujourd’hui',
          'demain',
          'matin',
          'après-midi',
          'soir',
          'place',
          'billet',
          'FCFA',
        ],
      });
    } catch {
      setListening(false);
      setMessage(
        'La voix nécessite une nouvelle version de l’application. La recherche texte reste disponible.'
      );
    }
  };

  const stopListening = () => {
    speechModuleRef.current?.stop?.();
    setListening(false);
  };

  const close = () => {
    if (listening) speechModuleRef.current?.abort?.();
    clearSpeechSubscriptions();
    setListening(false);
    setVisible(false);
  };

  return (
    <>
      <View pointerEvents="box-none" style={styles.floatingLayer}>
        <View style={styles.hintBubble}>
          <Text style={styles.hintText}>Rechercher avec l’IA</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Ouvrir l’agent de recherche EVEX"
          activeOpacity={0.9}
          style={styles.floatingButton}
          onPress={() => setVisible(true)}
        >
          <View style={styles.onlineDot} />
          <Ionicons name="sparkles" size={27} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={styles.agentAvatar}>
                <Ionicons name="sparkles" size={23} color={COLORS.white} />
                <View style={styles.avatarDot} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>AGENT DE VOYAGE EVEX</Text>
                <Text style={styles.title}>Où souhaitez-vous aller ?</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={close}>
                <Ionicons name="close" size={22} color="#50657E" />
              </TouchableOpacity>
            </View>

            <View style={styles.exampleBox}>
              <Ionicons name="bulb-outline" size={18} color="#3E6DA8" />
              <Text style={styles.exampleText}>
                Dites ou écrivez : « Kara vers Lomé demain matin pour deux personnes »
              </Text>
            </View>

            <View style={[styles.inputBox, listening && styles.inputBoxListening]}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={listening ? 'Je vous écoute…' : 'Décrivez votre voyage'}
                placeholderTextColor="#8799AE"
                style={styles.input}
                multiline
                maxLength={500}
                editable={!listening && !loading}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={listening ? 'Arrêter la dictée' : 'Rechercher avec la voix'}
                style={[styles.micButton, listening && styles.micButtonActive]}
                onPress={listening ? stopListening : () => void startListening()}
                disabled={loading}
              >
                <Ionicons
                  name={listening ? 'stop' : 'mic'}
                  size={22}
                  color={listening ? COLORS.white : COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {listening && (
              <View style={styles.listeningRow}>
                <View style={[styles.waveBar, styles.waveSmall]} />
                <View style={styles.waveBar} />
                <View style={[styles.waveBar, styles.waveTall]} />
                <View style={styles.waveBar} />
                <View style={[styles.waveBar, styles.waveSmall]} />
                <Text style={styles.listeningText}>Parlez naturellement</Text>
              </View>
            )}

            {message && (
              <View style={styles.messageBox}>
                <Ionicons
                  name={message.includes('trouvé') ? 'checkmark-circle' : 'information-circle'}
                  size={19}
                  color={message.includes('trouvé') ? '#14805D' : '#456D9D'}
                />
                <Text style={styles.messageText}>{message}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.searchButton,
                (query.trim().length < 3 || loading || listening) && styles.searchButtonDisabled,
              ]}
              disabled={query.trim().length < 3 || loading || listening}
              onPress={() => void runSearch(query)}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Ionicons name="search" size={20} color={COLORS.white} />
              )}
              <Text style={styles.searchButtonText}>
                {loading ? 'Recherche en cours…' : 'Trouver mon voyage'}
              </Text>
            </TouchableOpacity>

            {provider && (
              <Text style={styles.provider}>
                {provider === 'openai' ? 'Compréhension IA active' : 'Moteur EVEX sécurisé'}
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingLayer: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    alignItems: 'flex-end',
    zIndex: 40,
    elevation: 20,
  },
  hintBubble: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#102B50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#091A31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  hintText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  floatingButton: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0757C9',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.34,
    shadowRadius: 16,
    elevation: 14,
  },
  onlineDot: {
    position: 'absolute',
    right: 2,
    top: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#35D08B',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7, 20, 40, 0.58)' },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#06162C',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CAD6E5',
    marginBottom: 18,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  agentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#37CE8D',
    borderWidth: 2,
    borderColor: '#F8FBFF',
  },
  headerCopy: { flex: 1, marginLeft: 13 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.25 },
  title: { color: '#102A48', fontSize: 19, fontWeight: '900', marginTop: 3 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#EAF0F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleBox: {
    marginTop: 20,
    borderRadius: 17,
    backgroundColor: '#EAF3FF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  exampleText: { flex: 1, color: '#47617F', fontSize: 12, lineHeight: 18 },
  inputBox: {
    marginTop: 15,
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D3DFEE',
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
  },
  inputBoxListening: { borderColor: COLORS.primary, backgroundColor: '#F4F8FF' },
  input: {
    flex: 1,
    maxHeight: 100,
    color: '#102A48',
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 14,
  },
  micButton: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: '#E8F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: { backgroundColor: '#E33F55' },
  listeningRow: {
    marginTop: 12,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  waveBar: { width: 4, height: 14, borderRadius: 3, backgroundColor: COLORS.primary },
  waveSmall: { height: 8 },
  waveTall: { height: 22 },
  listeningText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginLeft: 7 },
  messageBox: {
    marginTop: 13,
    borderRadius: 15,
    backgroundColor: '#EDF3FA',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  messageText: { flex: 1, color: '#48617E', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  searchButton: {
    marginTop: 16,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  searchButtonDisabled: { opacity: 0.42 },
  searchButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '900' },
  provider: { textAlign: 'center', color: '#97A6BA', fontSize: 10, marginTop: 10 },
});
