import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Slider,
  Switch,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DemographicsSurvey: React.FC = () => {
  const { user, profile, loading: authLoading } = useFirebaseAuth();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    experienceYears: '',
    currentRole: '',
    organizationType: '',
    primaryRegion: '',
    educationLevel: '',
    computerUseFrequency: '',
    aiToolsUseFrequency: '',
    aiToolsForNegotiationFrequency: '',
    aiToolsConfidence: 3, // Default Likert scale value
    consentResearch: false,
    consentFollowUp: false,
    followUpEmail: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: any } }
  ) => {
    const { name, value, type } = event.target as any; // Cast to any for type gymnastics with Switch
    if (type === 'checkbox') { // Handle Material UI Switch (uses checked prop)
        setFormState((prev) => ({ ...prev, [name]: (event.target as HTMLInputElement).checked }));
    } else {
        setFormState((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setFormState((prev) => ({ ...prev, aiToolsConfidence: newValue as number }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (formState.consentFollowUp && !formState.followUpEmail) {
        setError('Please provide your email if you consent to a follow-up interview.');
        return;
    }

    setSubmitting(true);
    if (user && profile) {
      try {
        const surveyData: any = {
             experienceYears: formState.experienceYears,
             currentRole: formState.currentRole,
             organizationType: formState.organizationType,
             primaryRegion: formState.primaryRegion,
             educationLevel: formState.educationLevel,
             computerUseFrequency: formState.computerUseFrequency,
             aiToolsUseFrequency: formState.aiToolsUseFrequency,
             aiToolsForNegotiationFrequency: formState.aiToolsForNegotiationFrequency,
             aiToolsConfidence: formState.aiToolsConfidence,
             consentResearch: formState.consentResearch,
             consentFollowUp: formState.consentFollowUp,
        };

        if (formState.consentFollowUp) {
            surveyData.followUpEmail = formState.followUpEmail;
        }

        const userProfileRef = doc(db, 'userProfiles', user.uid);
        await setDoc(
          userProfileRef,
          {
            demographicsCompleted: true,
            demographicsData: surveyData,
            demographicsSubmittedAt: serverTimestamp(),
          },
          { merge: true }
        );
        navigate('/');
      } catch (err: any) {
        console.error('Error submitting survey:', err);
        setError(err.message || 'Failed to submit survey. Please try again.');
      } finally {
        setSubmitting(false);
      }
    } else {
      setError('User not found. Please log in again.');
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    navigate('/login'); // Should not happen if routing is correct, but good failsafe
    return null;
  }
  
  // If survey already completed, redirect (can also be handled by router wrapper)
  if (profile?.demographicsCompleted) {
    navigate('/');
    return null;
  }

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography component="h1" variant="h4" align="center" gutterBottom>
          Demographics Survey
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 3 }}>
          Please complete this survey to help us understand our users. Your responses are valuable.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* Section 1: Background and Experience */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Section 1: Background and Experience
          </Typography>
          <TextField
            margin="normal"
            required
            fullWidth
            name="experienceYears"
            label="1.1 Years of negotiation experience"
            type="number"
            value={formState.experienceYears}
            onChange={handleChange}
            InputProps={{ inputProps: { min: 0 } }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="currentRole"
            label="1.2 Current role in your organization"
            value={formState.currentRole}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="organizationType"
            label="1.3 Type of organization you work with"
            value={formState.organizationType}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="primaryRegion"
            label="1.4 Country or region you primarily operate in"
            value={formState.primaryRegion}
            onChange={handleChange}
          />

          {/* Section 2: Education */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Section 2: Education
          </Typography>
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="educationLevel-label">2.1 Highest level of education completed</InputLabel>
            <Select
              labelId="educationLevel-label"
              name="educationLevel"
              value={formState.educationLevel}
              label="2.1 Highest level of education completed"
              onChange={(e) => handleChange(e as any)} // Cast needed for Select
            >
              <MenuItem value="some_high_school">Some high school</MenuItem>
              <MenuItem value="high_school_diploma">High school diploma</MenuItem>
              <MenuItem value="college_undergraduate">College / Undergraduate</MenuItem>
              <MenuItem value="masters_professional">Master's / Professional degree</MenuItem>
              <MenuItem value="doctorate">Doctorate (PhD, etc.)</MenuItem>
            </Select>
          </FormControl>

          {/* Section 3: Technology and AI Use */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Section 3: Technology and AI Use
          </Typography>
          <FormControl component="fieldset" margin="normal" required>
            <FormLabel component="legend">3.1 How often do you use a computer for work?</FormLabel>
            <RadioGroup
              row
              name="computerUseFrequency"
              value={formState.computerUseFrequency}
              onChange={handleChange}
            >
              <FormControlLabel value="weekly_less" control={<Radio />} label="Once a week or less" />
              <FormControlLabel value="few_times_week" control={<Radio />} label="A few times a week" />
              <FormControlLabel value="couple_hours_most_days" control={<Radio />} label="A couple of hours most days" />
              <FormControlLabel value="many_hours_most_days" control={<Radio />} label="Many hours on most days" />
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset" margin="normal" required sx={{ display: 'block' }}>
            <FormLabel component="legend">3.2 How often do you use AI tools (like ChatGPT, Claude, Copilot)?</FormLabel>
            <RadioGroup
              row
              name="aiToolsUseFrequency"
              value={formState.aiToolsUseFrequency}
              onChange={handleChange}
            >
              <FormControlLabel value="never" control={<Radio />} label="Never" />
              <FormControlLabel value="monthly_less" control={<Radio />} label="Once a month or less" />
              <FormControlLabel value="few_times_month" control={<Radio />} label="A few times a month" />
              <FormControlLabel value="few_times_week_ai" control={<Radio />} label="A few times a week" />
              <FormControlLabel value="daily_more_ai" control={<Radio />} label="Daily or more" />
            </RadioGroup>
          </FormControl>
          
          <FormControl component="fieldset" margin="normal" required sx={{ display: 'block' }}>
            <FormLabel component="legend">3.3 How often do you use AI tools for negotiation-related work?</FormLabel>
            <RadioGroup
              row
              name="aiToolsForNegotiationFrequency"
              value={formState.aiToolsForNegotiationFrequency}
              onChange={handleChange}
            >
              <FormControlLabel value="never_neg" control={<Radio />} label="Never" />
              <FormControlLabel value="monthly_less_neg" control={<Radio />} label="Once a month or less" />
              <FormControlLabel value="few_times_month_neg" control={<Radio />} label="A few times a month" />
              <FormControlLabel value="few_times_week_neg" control={<Radio />} label="A few times a week" />
              <FormControlLabel value="daily_more_neg" control={<Radio />} label="Daily or more" />
            </RadioGroup>
          </FormControl>

          <Typography gutterBottom sx={{ mt: 2 }}>
            3.4 How confident do you feel using AI tools in your work? (1=Not confident at all, 5=Very confident)
          </Typography>
          <Slider
            name="aiToolsConfidence"
            value={formState.aiToolsConfidence}
            onChange={handleSliderChange}
            aria-labelledby="ai-confidence-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={1}
            max={5}
          />

          {/* Section 4: Consent and Future Contact */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Section 4: Consent and Future Contact
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={formState.consentResearch}
                onChange={handleChange}
                name="consentResearch"
                color="primary"
              />
            }
            label="4.1 Do you consent to your anonymized data being used for research purposes (e.g., improving this app, academic research)?"
            sx={{ display: 'block', mb: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formState.consentFollowUp}
                onChange={handleChange}
                name="consentFollowUp"
                color="primary"
              />
            }
            label="4.2 Are you open to being contacted for a short follow-up interview or feedback session?"
            sx={{ display: 'block', mb: 1 }}
          />
          {formState.consentFollowUp && (
            <TextField
              margin="normal"
              required
              fullWidth
              name="followUpEmail"
              label="Follow-up Email"
              type="email"
              value={formState.followUpEmail}
              onChange={handleChange}
            />
          )}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit Survey'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default DemographicsSurvey; 