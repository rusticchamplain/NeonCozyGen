import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PromptComposer from '../components/PromptComposer';
import { useStudioContext } from '../contexts/StudioContext';

export default function ComposerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    formData,
    handleFormChange,
    aliasOptions,
    aliasCatalog,
    promptFieldName,
    handleGenerate,
    workflowData,
    selectedWorkflow,
    isLoading,
  } = useStudioContext();

  const requestedField = searchParams.get('field');
  const composerField = requestedField || promptFieldName || 'prompt';
  const composerValue = formData?.[composerField] || '';

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.add('no-pull-refresh');
    document.documentElement.classList.add('no-pull-refresh');
    return () => {
      document.body.classList.remove('no-pull-refresh');
      document.documentElement.classList.remove('no-pull-refresh');
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!workflowData || !selectedWorkflow || isLoading) return;
      handleGenerate();
    };
    window.addEventListener('cozygen:request-render', handler);
    return () => window.removeEventListener('cozygen:request-render', handler);
  }, [handleGenerate, isLoading, selectedWorkflow, workflowData]);

  return (
    <PromptComposer
      open
      onClose={() => navigate('/controls')}
      value={composerValue}
      onChange={(nextValue) => handleFormChange(composerField, nextValue)}
      aliasOptions={aliasOptions}
      aliasCatalog={aliasCatalog}
      fieldLabel={composerField}
      variant="page"
    />
  );
}
