"use client";
import { NavbarActionButton } from "@/components/navigation/action-button";
import { CopyableIDButton } from "@/components/navigation/copyable-id-button";
import { Navbar } from "@/components/navigation/navbar";
import { usePersistedForm } from "@/hooks/use-persisted-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "@unkey/icons";
import {
  Button,
  Loading,
  NavigableDialogBody,
  NavigableDialogContent,
  NavigableDialogFooter,
  NavigableDialogHeader,
  NavigableDialogNav,
  NavigableDialogRoot,
  toast,
} from "@unkey/ui";
import { Suspense, useEffect, useState } from "react";
import { FormProvider, type Resolver } from "react-hook-form";
import { CodePreviewPanel, type CodeViewMode } from "./components/code-preview-panel";
import { KeyCreatedSuccessDialog } from "./components/key-created-success-dialog";
import { SectionLabel } from "./components/section-label";
import { type DialogSectionName, SECTIONS } from "./create-key.constants";
import { type FormValues, formSchema } from "./create-key.schema";
import { formValuesToApiInput, getDefaultValues } from "./create-key.utils";
import { useCreateKey } from "./hooks/use-create-key";
import { useValidateSteps } from "./hooks/use-validate-steps";

// Storage key for saving form state
const FORM_STORAGE_KEY = "unkey_create_key_form_state";

export const CreateKeyDialog = ({
  keyspaceId,
  apiId,
  copyIdValue,
  keyspaceDefaults,
}: {
  keyspaceId: string | null;
  apiId: string;
  copyIdValue?: string;
  keyspaceDefaults: {
    prefix?: string;
    bytes?: number;
  } | null;
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState<{
    key: string;
    id: string;
    name?: string;
  } | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [codeViewMode, setCodeViewMode] = useState<CodeViewMode>("expanded");

  const methods = usePersistedForm<FormValues>(
    FORM_STORAGE_KEY,
    {
      resolver: zodResolver(formSchema) as Resolver<FormValues>,
      mode: "onChange",
      shouldFocusError: true,
      shouldUnregister: true,
      defaultValues: getDefaultValues(keyspaceDefaults),
    },
    "memory",
  );

  const {
    handleSubmit,
    formState,
    getValues,
    reset,
    trigger,
    clearPersistedData,
    loadSavedValues,
    saveCurrentValues,
  } = methods;

  // Update form defaults when keyspace defaults change after revalidation
  useEffect(() => {
    const newDefaults = getDefaultValues(keyspaceDefaults);
    clearPersistedData();
    reset(newDefaults);
  }, [keyspaceDefaults, reset, clearPersistedData]);

  const { validSteps, validateSection, resetValidSteps } = useValidateSteps(
    isSettingsOpen,
    loadSavedValues,
    trigger,
    getValues,
  );

  const key = useCreateKey((data) => {
    if (data?.key && data?.keyId) {
      setCreatedKeyData({
        key: data.key,
        id: data.keyId,
        name: data.name,
      });
      setSuccessDialogOpen(true);
    }

    // Clean up form state
    clearPersistedData();
    reset(getDefaultValues());
    setIsSettingsOpen(false);
    resetValidSteps();
    // Force dialog to remount and reset to initial state (general section)
    setDialogKey((prev) => prev + 1);
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      saveCurrentValues();
      setDialogKey((prev) => prev + 1);
    }
    setIsSettingsOpen(open);
  };

  const onSubmit = async (data: FormValues) => {
    if (!keyspaceId) {
      toast.error("Failed to Create Key", {
        description: "An unexpected error occurred. Please try again later.",
        action: {
          label: "Contact Support",
          onClick: () => window.open("mailto:support@unkey.com", "_blank"),
        },
      });
      return;
    }
    const finalData = formValuesToApiInput(data, keyspaceId);

    try {
      await key.mutateAsync(finalData);
    } catch {
      // `useCreateKey` already shows a toast, but we still need to
      // prevent unhandled‐rejection noise in the console.
    }
  };

  const handleSectionNavigation = async (fromId: DialogSectionName) => {
    await validateSection(fromId);
    return true;
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialogOpen(false);
    setCreatedKeyData(null);
  };

  const openNewKeyDialog = () => {
    setIsSettingsOpen(true);
  };

  return (
    <>
      <Navbar.Actions>
        <NavbarActionButton title="Create new key" onClick={() => setIsSettingsOpen(true)}>
          <Plus />
          Create new key
        </NavbarActionButton>
        <CopyableIDButton value={copyIdValue ?? apiId} />
      </Navbar.Actions>

      <FormProvider {...methods}>
        <form id="new-key-form" onSubmit={handleSubmit(onSubmit)}>
          <NavigableDialogRoot
            key={dialogKey}
            isOpen={isSettingsOpen}
            onOpenChange={handleOpenChange}
            dialogClassName="w-[90%] md:w-[70%] lg:w-[70%] xl:w-[50%] 2xl:w-[45%] max-w-[940px] h-[92vh] md:h-[85vh] lg:h-[88vh] xl:h-[85vh] top-[45%] bg-transparent border-0 shadow-none drop-shadow-none overflow-visible gap-3"
          >
            {/* Main modal card */}
            {codeViewMode !== "full" && (
            <div className="bg-background border border-grayA-4 rounded-2xl overflow-hidden flex flex-col drop-shadow-2xl transform-gpu flex-1 min-h-0">
              <NavigableDialogHeader
                title="New Key"
                subTitle="Configure your key below, or copy the code equivalent to create via API"
              />
              <NavigableDialogBody>
                <NavigableDialogNav
                  items={SECTIONS.map((section) => ({
                    id: section.id,
                    label: <SectionLabel label={section.label} validState={validSteps[section.id]} />,
                    icon: section.icon,
                  }))}
                  onNavigate={handleSectionNavigation}
                  initialSelectedId="general"
                />
                <NavigableDialogContent
                  items={SECTIONS.map((section) => ({
                    id: section.id,
                    content: section.content(),
                  }))}
                  className="min-h-0 xl:min-h-0"
                  showScrollFade
                />
              </NavigableDialogBody>
              <NavigableDialogFooter>
                <div className="flex justify-end items-center w-full">
                  <Button
                    type="submit"
                    form="new-key-form"
                    variant="primary"
                    size="lg"
                    className="rounded-lg"
                    disabled={!formState.isValid}
                    loading={key.isLoading}
                  >
                    Create new key
                  </Button>
                </div>
              </NavigableDialogFooter>
            </div>
            )}

            {/* Code preview companion panel */}
            <CodePreviewPanel apiId={apiId} viewMode={codeViewMode} onViewModeChange={setCodeViewMode} />
          </NavigableDialogRoot>
        </form>
      </FormProvider>

      {/* Success Dialog */}
      <Suspense fallback={<Loading type="spinner" />}>
        <KeyCreatedSuccessDialog
          apiId={apiId}
          keyspaceId={keyspaceId}
          isOpen={successDialogOpen}
          onClose={handleSuccessDialogClose}
          keyData={createdKeyData}
          onCreateAnother={openNewKeyDialog}
        />
      </Suspense>
    </>
  );
};
