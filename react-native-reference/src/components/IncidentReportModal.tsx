import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '../constants/colors';
import { FONT_SIZES, FONT_WEIGHTS } from '../constants/fonts';
import {
  SafetyIncidentReportPayload,
  SafetyIncidentType,
  SafetyTravelState,
  ApiId,
} from '../types';

type DraftPayload = Omit<SafetyIncidentReportPayload, 'latitude' | 'longitude' | 'accuracy_m' | 'occurred_at'>;

interface Props {
  visible: boolean;
  tripId: ApiId | null;
  tripLabel: string;
  locationStatus: string;
  reporterMode?: 'driver' | 'passenger';
  onClose: () => void;
  onSubmit: (payload: DraftPayload) => Promise<string>;
}

const incidentTypes: Array<{ value: SafetyIncidentType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'accident', label: 'Accident', icon: 'warning' },
  { value: 'breakdown', label: 'Panne / crevaison', icon: 'construct' },
  { value: 'medical', label: 'Urgence médicale', icon: 'medkit' },
  { value: 'road_hazard', label: 'Danger routier', icon: 'trail-sign' },
  { value: 'security', label: 'Sécurité', icon: 'shield' },
  { value: 'other', label: 'Autre', icon: 'alert-circle' },
];

const travelStates: Array<{ value: SafetyTravelState; label: string }> = [
  { value: 'stopped', label: 'Bus à l’arrêt' },
  { value: 'continuing', label: 'Peut continuer' },
  { value: 'unknown', label: 'Je ne sais pas' },
];

const makeIdempotencyKey = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
  const random = Math.floor(Math.random() * 16);
  const value = character === 'x' ? random : (random & 0x3) | 0x8;
  return value.toString(16);
});

export default function IncidentReportModal({
  visible,
  tripId,
  tripLabel,
  locationStatus,
  reporterMode = 'driver',
  onClose,
  onSubmit,
}: Props) {
  const [incidentType, setIncidentType] = useState<SafetyIncidentType | null>(null);
  const [travelState, setTravelState] = useState<SafetyTravelState | null>(null);
  const [description, setDescription] = useState('');
  const [injuredCount, setInjuredCount] = useState('0');
  const [emergencyContacted, setEmergencyContacted] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [recordedReference, setRecordedReference] = useState<string | null>(null);

  const storageKey = tripId == null ? null : `evex:safety-incident-draft:${reporterMode}:${String(tripId)}`;

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setDraftReady(false);
    setConfirming(false);
    setSubmitting(false);
    setError(null);
    setRecordedReference(null);
    const restore = async () => {
      let restored: Partial<DraftPayload> | null = null;
      if (storageKey) {
        try {
          const raw = await AsyncStorage.getItem(storageKey);
          restored = raw ? JSON.parse(raw) as Partial<DraftPayload> : null;
        } catch {
          restored = null;
        }
      }
      if (!mounted) return;
      const restoredType = incidentTypes.some((item) => item.value === restored?.incident_type)
        ? restored?.incident_type as SafetyIncidentType
        : null;
      const restoredState = travelStates.some((item) => item.value === restored?.travel_state)
        ? restored?.travel_state as SafetyTravelState
        : null;
      setIncidentType(restoredType);
      setTravelState(restoredState);
      setDescription(typeof restored?.description === 'string' ? restored.description : '');
      setInjuredCount(Number.isInteger(restored?.injured_count) ? String(restored?.injured_count) : '0');
      setEmergencyContacted(restored?.emergency_services_contacted === true);
      setIdempotencyKey(
        typeof restored?.idempotency_key === 'string'
          ? restored.idempotency_key
          : makeIdempotencyKey(),
      );
      setDraftReady(true);
    };
    void restore();
    return () => { mounted = false; };
  }, [storageKey, visible]);

  useEffect(() => {
    if (!visible || !storageKey || !draftReady || recordedReference) return;
    void AsyncStorage.setItem(storageKey, JSON.stringify({
      incident_type: incidentType,
      travel_state: travelState,
      description,
      injured_count: Number(injuredCount),
      emergency_services_contacted: emergencyContacted,
      idempotency_key: idempotencyKey,
    })).catch(() => undefined);
  }, [description, draftReady, emergencyContacted, idempotencyKey, incidentType, injuredCount, recordedReference, storageKey, travelState, visible]);

  const selectedType = incidentTypes.find((item) => item.value === incidentType);
  const selectedTravelState = travelStates.find((item) => item.value === travelState);

  const continueToConfirmation = () => {
    if (!incidentType || !travelState) {
      setError('Choisissez le type d’incident et l’état du bus.');
      return;
    }
    const count = Number(injuredCount);
    if (!Number.isInteger(count) || count < 0 || count > 999) {
      setError('Le nombre de blessés doit être compris entre 0 et 999.');
      return;
    }
    setError(null);
    setConfirming(true);
  };

  const submit = async () => {
    if (!incidentType || !travelState) return;
    setSubmitting(true);
    setError(null);
    try {
      const reference = await onSubmit({
        incident_type: incidentType,
        travel_state: travelState,
        description: description.trim(),
        injured_count: Number(injuredCount),
        emergency_services_contacted: emergencyContacted,
        idempotency_key: idempotencyKey,
      });
      if (storageKey) await AsyncStorage.removeItem(storageKey).catch(() => undefined);
      setRecordedReference(reference);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Signalement non envoyé. Vérifiez la connexion puis réessayez.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const abandonDraft = async () => {
    if (storageKey) await AsyncStorage.removeItem(storageKey).catch(() => undefined);
    onClose();
  };

  if (!draftReady) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={[styles.container, styles.loadingDraft]}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingDraftText}>Préparation du signalement…</Text></View>
      </Modal>
    );
  }

  if (recordedReference) {
    return (
      <Modal visible={visible} animationType="fade" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={[styles.container, styles.successContainer]}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={42} color={COLORS.white} /></View>
          <Text style={styles.successTitle}>Signalement enregistré</Text>
          <Text style={styles.successText}>
            Référence {recordedReference.slice(0, 8)}. {reporterMode === 'passenger'
              ? 'La compagnie a reçu votre déclaration et doit maintenant la vérifier.'
              : 'L’alerte est désormais visible dans le suivi EVEX.'}
          </Text>
          <TouchableOpacity style={styles.successButton} onPress={onClose}><Text style={styles.successButtonText}>Fermer</Text></TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={submitting ? undefined : onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Ionicons name="shield-checkmark" size={23} color={COLORS.error} />
            <Text style={styles.title}>Sécurité du trajet</Text>
          </View>
          <TouchableOpacity onPress={onClose} disabled={submitting} style={styles.closeButton} accessibilityLabel="Fermer">
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.stopFirstCard}>
            <Ionicons name="hand-left" size={22} color="#92400E" />
            <Text style={styles.stopFirstText}>
              {reporterMode === 'passenger'
                ? 'Décrivez uniquement ce que vous constatez. La compagnie vérifiera le signalement avant toute mesure sur les ventes.'
                : 'Immobilisez le véhicule avant toute manipulation, si cela peut être fait sans danger.'}
            </Text>
          </View>

          <View style={styles.tripCard}>
            <Text style={styles.label}>VOYAGE CONCERNÉ</Text>
            <Text style={styles.tripLabel}>{tripLabel}</Text>
          </View>

          {!confirming ? (
            <>
              <Text style={styles.sectionTitle}>Que se passe-t-il ?</Text>
              <View style={styles.optionGrid}>
                {incidentTypes.map((item) => {
                  const selected = item.value === incidentType;
                  return (
                    <TouchableOpacity key={item.value} style={[styles.typeOption, selected && styles.typeOptionSelected]} onPress={() => setIncidentType(item.value)} accessibilityRole="radio" accessibilityState={{ selected }}>
                      <Ionicons name={item.icon} size={21} color={selected ? COLORS.error : COLORS.textSecondary} />
                      <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>Le bus peut-il continuer ?</Text>
              <View style={styles.stateRow}>
                {travelStates.map((item) => {
                  const selected = item.value === travelState;
                  return <TouchableOpacity key={item.value} style={[styles.stateOption, selected && styles.stateOptionSelected]} onPress={() => setTravelState(item.value)}><Text style={[styles.stateText, selected && styles.stateTextSelected]}>{item.label}</Text></TouchableOpacity>;
                })}
              </View>

              <Text style={styles.fieldLabel}>Détails utiles à la compagnie (facultatif)</Text>
              <TextInput multiline maxLength={1000} value={description} onChangeText={setDescription} placeholder="Décrivez brièvement la situation" placeholderTextColor={COLORS.textMuted} style={[styles.input, styles.textArea]} textAlignVertical="top" />

              <Text style={styles.fieldLabel}>Nombre de blessés constatés</Text>
              <TextInput keyboardType="number-pad" value={injuredCount} onChangeText={setInjuredCount} style={styles.input} />

              <View style={styles.switchRow}>
                <View style={styles.switchCopy}><Text style={styles.switchTitle}>Les secours ont déjà été contactés</Text><Text style={styles.switchHint}>Cette option enregistre l’information ; elle ne passe aucun appel.</Text></View>
                <Switch value={emergencyContacted} onValueChange={setEmergencyContacted} trackColor={{ false: COLORS.gray, true: '#FCA5A5' }} thumbColor={emergencyContacted ? COLORS.error : COLORS.white} />
              </View>
            </>
          ) : (
            <View style={styles.confirmCard}>
              <Ionicons name="alert-circle" size={42} color={COLORS.error} />
              <Text style={styles.confirmTitle}>Confirmer le signalement</Text>
              <Text style={styles.confirmLine}><Text style={styles.confirmStrong}>Incident : </Text>{selectedType?.label}</Text>
              <Text style={styles.confirmLine}><Text style={styles.confirmStrong}>État : </Text>{selectedTravelState?.label}</Text>
              <Text style={styles.confirmLine}><Text style={styles.confirmStrong}>Blessés déclarés : </Text>{injuredCount}</Text>
              <Text style={styles.confirmLine}><Text style={styles.confirmStrong}>Secours déjà contactés : </Text>{emergencyContacted ? 'oui' : 'non / inconnu'}</Text>
              <Text style={styles.confirmLine}><Text style={styles.confirmStrong}>Position : </Text>{locationStatus}</Text>
              {description.trim() ? <Text style={styles.confirmDescription}><Text style={styles.confirmStrong}>Détails : </Text>{description.trim()}</Text> : null}
              <Text style={styles.confirmHint}>Le signalement reste possible sans GPS.</Text>
            </View>
          )}

          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyText}><Text style={styles.emergencyStrong}>Danger immédiat : </Text>EVEX ne contacte pas automatiquement les services d’urgence. Appelez directement les secours locaux.</Text>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity onPress={() => void abandonDraft()} disabled={submitting} style={styles.abandonButton}>
            <Text style={styles.abandonText}>Abandonner et effacer ce brouillon</Text>
          </TouchableOpacity>
          <View style={styles.actions}>
            {confirming && <TouchableOpacity style={styles.backButton} onPress={() => setConfirming(false)} disabled={submitting}><Text style={styles.backText}>Modifier</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.submitButton} onPress={confirming ? () => void submit() : continueToConfirmation} disabled={submitting}>
              {submitting ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name={confirming ? 'radio' : 'arrow-forward'} size={20} color={COLORS.white} />}
              <Text style={styles.submitText}>{submitting ? 'Enregistrement…' : confirming ? 'Enregistrer le signalement' : 'Vérifier le signalement'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.canvas },
  loadingDraft: { alignItems: 'center', justifyContent: 'center' },
  loadingDraftText: { marginTop: 12, color: COLORS.textSecondary },
  successContainer: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  successIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  successTitle: { marginTop: 20, fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text, textAlign: 'center' },
  successText: { marginTop: 10, color: COLORS.textSecondary, fontSize: FONT_SIZES.base, lineHeight: 23, textAlign: 'center' },
  successButton: { minHeight: 52, minWidth: 180, marginTop: 24, borderRadius: 28, backgroundColor: COLORS.action, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  successButtonText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold },
  header: { minHeight: 64, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { flexDirection: 'row', alignItems: 'center' },
  title: { marginLeft: 9, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  closeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  stopFirstCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 26, backgroundColor: '#FEF3C7', marginBottom: 14 },
  stopFirstText: { flex: 1, marginLeft: 10, color: '#78350F', fontSize: FONT_SIZES.sm, lineHeight: 20 },
  tripCard: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 26, padding: 14 },
  label: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  tripLabel: { marginTop: 5, color: COLORS.text, fontWeight: FONT_WEIGHTS.bold },
  sectionTitle: { marginTop: 22, marginBottom: 10, color: COLORS.text, fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.bold },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  typeOption: { width: '48.5%', minHeight: 58, padding: 11, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center' },
  typeOptionSelected: { borderColor: COLORS.error, backgroundColor: '#FEF2F2' },
  typeText: { marginLeft: 8, flex: 1, color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold },
  typeTextSelected: { color: '#991B1B' },
  stateRow: { flexDirection: 'row' },
  stateOption: { flex: 1, minHeight: 50, marginRight: 7, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: COLORS.white },
  stateOptionSelected: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  stateText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold },
  stateTextSelected: { color: COLORS.primary },
  fieldLabel: { marginTop: 19, marginBottom: 8, color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold },
  input: { minHeight: 50, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.white, paddingHorizontal: 13, color: COLORS.text },
  textArea: { minHeight: 100, paddingTop: 12 },
  switchRow: { marginTop: 18, padding: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center' },
  switchCopy: { flex: 1, marginRight: 12 },
  switchTitle: { color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold },
  switchHint: { marginTop: 3, color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, lineHeight: 17 },
  confirmCard: { marginTop: 18, padding: 20, borderRadius: 26, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#FECACA', alignItems: 'center' },
  confirmTitle: { marginTop: 10, marginBottom: 15, color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold },
  confirmLine: { alignSelf: 'stretch', marginTop: 6, color: COLORS.textSecondary },
  confirmStrong: { color: COLORS.text, fontWeight: FONT_WEIGHTS.bold },
  confirmDescription: { alignSelf: 'stretch', marginTop: 12, borderRadius: 12, backgroundColor: COLORS.canvas, padding: 10, color: COLORS.textSecondary, lineHeight: 19 },
  confirmHint: { marginTop: 15, color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, lineHeight: 18, textAlign: 'center' },
  emergencyCard: { marginTop: 18, borderRadius: 26, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', padding: 13 },
  emergencyText: { color: '#991B1B', fontSize: FONT_SIZES.sm, lineHeight: 20 },
  emergencyStrong: { fontWeight: FONT_WEIGHTS.bold },
  error: { marginTop: 12, color: COLORS.error, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold },
  abandonButton: { minHeight: 44, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  abandonText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, textDecorationLine: 'underline' },
  actions: { marginTop: 20, flexDirection: 'row' },
  backButton: { minHeight: 52, paddingHorizontal: 18, marginRight: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  backText: { color: COLORS.text, fontWeight: FONT_WEIGHTS.bold },
  submitButton: { minHeight: 52, flex: 1, borderRadius: 28, backgroundColor: COLORS.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  submitText: { marginLeft: 8, color: COLORS.white, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center' },
});
