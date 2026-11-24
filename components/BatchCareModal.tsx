import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTheme, Theme } from "../contexts/ThemeContext";
import { useGlobalStyles } from "../styles";
import { ChevronRight } from "lucide-react-native";
import DateTimeInput from "./DateTimeInput";
import { formStyles } from "../styles/FormStyles";
import {
  CARE_ACTIONS,
  CareEventType,
  FertilizerStrength,
  FERTILIZER_STRENGTHS,
  PEST_SEVERITY_LEVELS,
  getCareTypeByType,
} from "../constants/careTypes";

export interface CareDetails {
  notes: string;
  fertilizerStrength: FertilizerStrength;
  pestSeverity: number;
  date: Date;
}

interface BatchCareModalProps {
  visible: boolean;
  selectedCount: number;
  onClose: () => void;
  onSubmit: (careType: CareEventType, details: CareDetails) => Promise<void>;
}

type ModalStep = "select" | "details";

export default function BatchCareModal({
  visible,
  selectedCount,
  onClose,
  onSubmit,
}: BatchCareModalProps) {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);

  const [step, setStep] = useState<ModalStep>("select");
  const [selectedCareType, setSelectedCareType] =
    useState<CareEventType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [careDetails, setCareDetails] = useState<CareDetails>({
    notes: "",
    fertilizerStrength: "1x",
    pestSeverity: 1,
    date: new Date(),
  });

  const resetState = () => {
    setStep("select");
    setSelectedCareType(null);
    setSubmitting(false);
    setCareDetails({
      notes: "",
      fertilizerStrength: "1x",
      pestSeverity: 1,
      date: new Date(),
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleCareTypeSelect = (careType: CareEventType) => {
    setSelectedCareType(careType);
    setStep("details");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedCareType(null);
  };

  const handleConfirm = async () => {
    if (!selectedCareType || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(selectedCareType, careDetails);
      resetState();
    } catch (error) {
      console.error("Failed to submit batch care:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderCareTypeSelection = () => (
    <View style={globalStyles.modalContent}>
      <Text style={globalStyles.modalTitle}>Select Event Type</Text>
      <Text style={globalStyles.bodySmall}>
        {selectedCount} plant{selectedCount !== 1 ? "s" : ""} selected
      </Text>

      <ScrollView style={styles.careTypeList}>
        {CARE_ACTIONS.map((careType) => {
          const IconComponent = careType.icon;
          return (
            <TouchableOpacity
              key={careType.type}
              style={styles.careTypeItem}
              onPress={() => handleCareTypeSelect(careType.type)}
            >
              <View
                style={[
                  styles.careTypeIconWrap,
                  { backgroundColor: `${careType.color}1F` },
                ]}
              >
                <IconComponent size={18} color={careType.color} />
              </View>
              <Text style={styles.careTypeLabel}>{careType.label}</Text>
              <ChevronRight size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={globalStyles.buttonSecondary}
        onPress={handleClose}
      >
        <Text
          style={[
            globalStyles.buttonTextSecondary,
            { color: theme.colors.textPrimary },
          ]}
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDetailsForm = () => {
    if (!selectedCareType) return null;

    const careTypeInfo = getCareTypeByType(selectedCareType);
    if (!careTypeInfo) return null;

    const IconComponent = careTypeInfo.icon;
    const showFertilizerOptions =
      selectedCareType === "fertilize" || selectedCareType === "fertigate";
    const showPestSeverity = selectedCareType === "pest_spotted";

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={[globalStyles.modalContent, styles.detailsModalContent]}>
          <View style={globalStyles.modalHeader}>
            <View style={globalStyles.flexRowCenter}>
              <IconComponent size={24} color={careTypeInfo.color} />
              <Text style={[globalStyles.modalTitle, styles.detailsTitle]}>
                {careTypeInfo.label} Details
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.detailsScrollView}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailsScrollContent}
          >
            <Text style={styles.selectedCountText}>
              {selectedCount} plant{selectedCount !== 1 ? "s" : ""} selected
            </Text>

            <View style={globalStyles.inputGroup}>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateSection}>
                  <DateTimeInput
                    value={careDetails.date}
                    mode="date"
                    label="Date"
                    compact
                    onChange={(date) =>
                      setCareDetails((prev) => ({ ...prev, date }))
                    }
                  />
                </View>
                <View style={styles.timeSection}>
                  <DateTimeInput
                    value={careDetails.date}
                    mode="time"
                    label="Time"
                    compact
                    onChange={(date) =>
                      setCareDetails((prev) => ({ ...prev, date }))
                    }
                  />
                </View>
              </View>
              <View style={styles.buttonSection}>
                <TouchableOpacity
                  style={styles.nowButton}
                  onPress={() =>
                    setCareDetails((prev) => ({ ...prev, date: new Date() }))
                  }
                >
                  <Text style={styles.nowButtonText}>Now</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showFertilizerOptions && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Fertilizer Strength</Text>
                <View style={styles.strengthContainer}>
                  {FERTILIZER_STRENGTHS.map((strength) => (
                    <TouchableOpacity
                      key={strength}
                      style={[
                        styles.strengthOption,
                        careDetails.fertilizerStrength === strength &&
                          styles.strengthOptionSelected,
                      ]}
                      onPress={() =>
                        setCareDetails((prev) => ({
                          ...prev,
                          fertilizerStrength: strength,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.strengthText,
                          careDetails.fertilizerStrength === strength &&
                            styles.strengthTextSelected,
                        ]}
                      >
                        {strength}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {showPestSeverity && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>
                  Pest Severity (1-10 scale)
                </Text>
                <Text style={globalStyles.sublabel}>
                  1 = Minor issue, 10 = Severe infestation
                </Text>
                <View style={styles.severityContainer}>
                  {PEST_SEVERITY_LEVELS.map((severity) => {
                    const isSelected = careDetails.pestSeverity === severity;
                    const severityStyle = getSeverityStyle(
                      severity,
                      isSelected,
                      styles,
                    );

                    return (
                      <TouchableOpacity
                        key={severity}
                        style={[styles.severityButton, severityStyle]}
                        onPress={() =>
                          setCareDetails((prev) => ({
                            ...prev,
                            pestSeverity: severity,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.severityText,
                            isSelected && styles.severityTextSelected,
                          ]}
                        >
                          {severity}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Notes</Text>
              <TextInput
                style={globalStyles.inputTextArea}
                value={careDetails.notes}
                onChangeText={(text) =>
                  setCareDetails((prev) => ({ ...prev, notes: text }))
                }
                placeholder="Additional notes about this event..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[globalStyles.buttonSecondary, styles.backButton]}
              onPress={handleBack}
            >
              <Text
                style={[
                  globalStyles.buttonTextSecondary,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                globalStyles.button,
                styles.confirmButton,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <View style={globalStyles.flexRowCenter}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textOnPrimary}
                    style={styles.submitSpinner}
                  />
                  <Text style={globalStyles.buttonText} numberOfLines={1}>
                    Submitting...
                  </Text>
                </View>
              ) : (
                <Text style={globalStyles.buttonText} numberOfLines={1}>
                  Confirm
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={globalStyles.modalOverlay}>
        {step === "select" ? renderCareTypeSelection() : renderDetailsForm()}
      </View>
    </Modal>
  );
}

const getSeverityStyle = (
  severity: number,
  isSelected: boolean,
  styles: ReturnType<typeof createStyles>,
) => {
  if (severity <= 3) {
    return isSelected ? styles.severityLowSelected : styles.severityLow;
  } else if (severity <= 6) {
    return isSelected ? styles.severityMediumSelected : styles.severityMedium;
  } else {
    return isSelected ? styles.severityHighSelected : styles.severityHigh;
  }
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    careTypeList: { maxHeight: 400, marginTop: 12, marginBottom: 16 },
    careTypeItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    careTypeIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    careTypeLabel: { flex: 1, fontSize: 16, color: theme.colors.text },
    keyboardAvoidingView: {
      flex: 1,
      justifyContent: "center",
    },
    detailsModalContent: {
      maxHeight: "80%",
      minHeight: 300,
    },
    detailsTitle: { marginLeft: 10 },
    detailsScrollView: {
      maxHeight: 400,
    },
    detailsScrollContent: {
      paddingBottom: 8,
    },
    selectedCountText: { ...formStyles(theme).helper, marginBottom: 12 },
    dateTimeRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    dateSection: {
      flex: 3,
      minWidth: 0,
    },
    timeSection: {
      flex: 2,
      minWidth: 0,
    },
    buttonSection: { justifyContent: 'flex-end' },
    nowButton: { ...formStyles(theme).smallButton, height: 48, borderRadius: 12, paddingHorizontal: 14 },
    nowButtonText: formStyles(theme).smallButtonText,
    strengthContainer: { flexDirection: 'row', gap: 8 },
    strengthOption: { ...formStyles(theme).chip, flex: 1, paddingHorizontal: 4 },
    strengthOptionSelected: formStyles(theme).chipSelected,
    strengthText: formStyles(theme).chipText,
    strengthTextSelected: formStyles(theme).chipTextSelected,
    severityContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    severityButton: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', opacity: 0.55 },
    severityLow: {
      backgroundColor: "#4CAF50",
    },
    severityMedium: {
      backgroundColor: "#ffcb2e",
    },
    severityHigh: {
      backgroundColor: "#F44336",
    },
    severityLowSelected: { backgroundColor: '#4CAF50', opacity: 1, transform: [{ scale: 1.15 }] },
    severityMediumSelected: { backgroundColor: '#ffcb2e', opacity: 1, transform: [{ scale: 1.15 }] },
    severityHighSelected: { backgroundColor: '#F44336', opacity: 1, transform: [{ scale: 1.15 }] },
    severityText: {
      fontSize: 14,
      color: "#FFFFFF",
    },
    severityTextSelected: {
      fontWeight: "bold",
      fontSize: 16,
    },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    backButton: { flex: 1 },
    confirmButton: { flex: 1 },
    buttonDisabled: formStyles(theme).buttonDisabled,
    submitSpinner: {
      marginRight: 8,
    },
  });
