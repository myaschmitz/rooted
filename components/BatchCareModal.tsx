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
import DateTimeInput from "./DateTimeInput";
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
              <IconComponent size={24} color={careType.color} />
              <Text style={styles.careTypeLabel}>{careType.label}</Text>
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
                <View>
                  <DateTimeInput
                    value={careDetails.date}
                    mode="date"
                    label="Date"
                    onChange={(date) =>
                      setCareDetails((prev) => ({ ...prev, date }))
                    }
                  />
                </View>
                <View>
                  <DateTimeInput
                    value={careDetails.date}
                    mode="time"
                    label="Time"
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
                  <Text style={styles.nowButtonText}>Set to Now</Text>
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
    careTypeList: {
      maxHeight: 400,
    },
    careTypeItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    careTypeLabel: {
      marginLeft: 12,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    keyboardAvoidingView: {
      flex: 1,
      justifyContent: "center",
    },
    detailsModalContent: {
      maxHeight: "80%",
      minHeight: 300,
    },
    detailsTitle: {
      marginLeft: 8,
    },
    detailsScrollView: {
      maxHeight: 400,
    },
    detailsScrollContent: {
      paddingBottom: 8,
    },
    selectedCountText: {
      marginBottom: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    dateTimeRow: {
      flexDirection: "column",
      gap: 4,
    },
    buttonSection: {
      alignItems: "flex-start",
      marginTop: 4,
    },
    nowButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    nowButtonText: {
      color: theme.colors.background,
      fontSize: 12,
      fontWeight: "600",
    },
    strengthContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    strengthOption: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: "center",
      marginHorizontal: 4,
    },
    strengthOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    strengthText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    strengthTextSelected: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    severityContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    severityButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    severityLow: {
      backgroundColor: "#4CAF50",
    },
    severityMedium: {
      backgroundColor: "#ffcb2e",
    },
    severityHigh: {
      backgroundColor: "#F44336",
    },
    severityLowSelected: {
      backgroundColor: "#2E7D32",
      transform: [{ scale: 1.1 }],
      shadowColor: theme.colors.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 6,
    },
    severityMediumSelected: {
      backgroundColor: "#e6ad00",
      transform: [{ scale: 1.1 }],
      shadowColor: theme.colors.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 6,
    },
    severityHighSelected: {
      backgroundColor: "#C62828",
      transform: [{ scale: 1.1 }],
      shadowColor: theme.colors.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 6,
    },
    severityText: {
      fontSize: 14,
      color: "#FFFFFF",
    },
    severityTextSelected: {
      fontWeight: "bold",
      fontSize: 16,
    },
    buttonRow: {
      flexDirection: "row",
      marginTop: 16,
    },
    backButton: {
      flex: 1,
      marginRight: 8,
    },
    confirmButton: {
      flex: 1,
      marginLeft: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    submitSpinner: {
      marginRight: 8,
    },
  });
