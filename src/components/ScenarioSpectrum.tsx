import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Paper, Tooltip, TextField, IconButton, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import * as d3 from 'd3';
import { Scenario } from '../store/negotiationSlice';

interface ScenarioSpectrumProps {
  scenarios: Scenario[];
  onSelectScenario: (scenario: Scenario) => void;
  onUpdateScenario?: (scenario: Scenario) => void;
  selectedScenarioId?: string;
  party1Name?: string;
  party2Name?: string;
  loadedScenarios?: string[];
}

// Scenario type names mapping
const getScenarioTypeNames = (party1Name: string, party2Name: string) => ({
  'redline_violated_p1': `${party1Name} Redline Violated`,
  'bottomline_violated_p1': `${party1Name} Bottomline Violated`,
  'agreement_area': 'Agreement Area',
  'bottomline_violated_p2': `${party2Name} Bottomline Violated`,
  'redline_violated_p2': `${party2Name} Redline Violated`
});

// Color mapping for scenario types
const getColorForType = (type: string) => {
  switch (type) {
    case 'redline_violated_p1':
      return "#ff5252";
    case 'bottomline_violated_p1':
      return "#ff9800";
    case 'agreement_area':
      return "#4caf50";
    case 'bottomline_violated_p2':
      return "#ff9800";
    case 'redline_violated_p2':
      return "#ff5252";
    default:
      return "#ccc";
  }
};

const useScenarioSpectrumData = (
  scenarios: Scenario[],
  loadedScenarios?: string[]
) => {
  return useMemo(() => {
    const validScenarios = scenarios.filter(scenario => (
      scenario.type !== undefined &&
      scenario.description?.trim() !== '' &&
      !scenario.description?.includes('placeholder')
    ));

    const areScenariosLoading = Boolean(
      loadedScenarios &&
      scenarios.length > 0 &&
      scenarios.some(s => !loadedScenarios.includes(s.id))
    );

    const displayedScenarios = validScenarios.slice(0, 5);
    const hasNoScenarios = displayedScenarios.length === 0 && !areScenariosLoading;

    return {
      validScenarios,
      displayedScenarios,
      areScenariosLoading,
      hasNoScenarios
    };
  }, [loadedScenarios, scenarios]);
};

type ScenarioPositions = {[key: string]: { x: number; y: number }};

interface SpectrumChartOptions {
  scenarios: Scenario[];
  selectedScenarioId?: string;
  party1Name: string;
  party2Name: string;
  svgRef: React.RefObject<SVGSVGElement>;
  setHoveredScenario: (id: string | null) => void;
  scenarioPositions: ScenarioPositions;
  setScenarioPositions: React.Dispatch<React.SetStateAction<ScenarioPositions>>;
  onSelectScenario: (scenario: Scenario) => void;
}

const useScenarioSpectrumChart = ({
  scenarios,
  selectedScenarioId,
  party1Name,
  party2Name,
  svgRef,
  setHoveredScenario,
  scenarioPositions,
  setScenarioPositions,
  onSelectScenario
}: SpectrumChartOptions) => {
  useEffect(() => {
    if (!svgRef.current || scenarios.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = 120;
    const margin = { top: 20, right: 20, bottom: 30, left: 20 };

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const scenarioCount = 5;
    const xScale = d3.scaleLinear()
      .domain([0, scenarioCount - 1])
      .range([width - margin.right, margin.left]);

    svg.append("text")
      .attr("x", margin.left)
      .attr("y", 15)
      .attr("text-anchor", "start")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(`Increasing risk for ${party2Name} →`);

    const spectrumGroup = svg.append("g")
      .attr("transform", `translate(0, ${height / 2})`);

    const zopaWidth = (xScale(1) - xScale(3));
    spectrumGroup.append("rect")
      .attr("x", xScale(3))
      .attr("y", -15)
      .attr("width", zopaWidth)
      .attr("height", 30)
      .attr("fill", "rgba(0, 255, 0, 0.1)")
      .attr("rx", 15);

    svg.append("text")
      .attr("x", xScale(2))
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .attr("font-size", "10px")
      .text("Zone of Possible Agreement");

    spectrumGroup.append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2);

    const displayScenarios = scenarios.slice(0, 5).map((scenario, index) => ({
      ...scenario,
      displayNumber: index + 1
    }));

    while (displayScenarios.length < 5) {
      displayScenarios.push({
        id: `placeholder-${displayScenarios.length}`,
        componentId: '',
        type: 'agreement_area',
        displayNumber: displayScenarios.length + 1,
        description: ''
      } as Scenario & { displayNumber: number });
    }

    const reversedScenarios = [...displayScenarios].reverse();

    spectrumGroup.selectAll("circle")
      .data(reversedScenarios)
      .enter()
      .append("circle")
      .attr("cx", (_d, i) => xScale(i))
      .attr("cy", 0)
      .attr("r", d => d.id === selectedScenarioId ? 8 : 6)
      .attr("fill", d => {
        if (d.id.startsWith('placeholder')) {
          return '#cccccc40';
        }

        const color = d.type.includes('redline') ? '#ff4444' :
          d.type.includes('bottomline') ? '#ffaa00' :
            '#44aa44';
        return d.id === selectedScenarioId ? color : `${color}80`;
      })
      .attr("class", "scenario-dot")
      .style("cursor", d => d.id.startsWith('placeholder') ? 'default' : "pointer")
      .style("transition", "all 0.3s ease")
      .style("filter", d => {
        if (d.id === selectedScenarioId) {
          const color = d.type.includes('redline') ? '#ff4444' :
            d.type.includes('bottomline') ? '#ffaa00' :
              '#44aa44';
          return `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 6px ${color})`;
        }
        return "none";
      })
      .on("click", (_event, d) => {
        if (!d.id.startsWith('placeholder')) {
          onSelectScenario(d);
        }
      })
      .on("mouseover", (_event, d) => {
        if (!d.id.startsWith('placeholder')) {
          setHoveredScenario(d.id);
        }
      })
      .on("mouseout", () => setHoveredScenario(null));

    spectrumGroup.selectAll("text.scenario-number")
      .data(reversedScenarios)
      .enter()
      .append("text")
      .attr("class", "scenario-number")
      .attr("x", (_d, i) => xScale(i))
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("fill", d => d.id.startsWith('placeholder') ? '#ccc' : "#666")
      .attr("font-size", "12px")
      .text((_d, i) => 5 - i);

    svg.append("text")
      .attr("x", margin.left)
      .attr("y", height - 5)
      .attr("text-anchor", "start")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(party1Name);

    svg.append("text")
      .attr("x", width - margin.right)
      .attr("y", height - 5)
      .attr("text-anchor", "end")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(party2Name);

    const positions: ScenarioPositions = {};

    displayScenarios.forEach((scenario, i) => {
      if (!scenario.id.startsWith('placeholder')) {
        positions[scenario.id] = {
          x: xScale(4 - i) + margin.left,
          y: 30 + margin.top
        };
      }
    });

    let positionsChanged = false;
    if (Object.keys(positions).length !== Object.keys(scenarioPositions).length) {
      positionsChanged = true;
    } else {
      for (const id in positions) {
        if (!scenarioPositions[id] ||
          positions[id].x !== scenarioPositions[id].x ||
          positions[id].y !== scenarioPositions[id].y) {
          positionsChanged = true;
          break;
        }
      }
    }

    if (positionsChanged) {
      setScenarioPositions(() => positions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectScenario, party1Name, party2Name, scenarios, selectedScenarioId]);
};

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  isEditing: boolean;
  editedDescription: string;
  scenarioColor: string;
  scenarioLabel: string;
  isLoaded: boolean;
  allowEditing: boolean;
  onSelect: (scenario: Scenario) => void;
  onEdit: (scenario: Scenario) => void;
  onSave: (scenario: Scenario) => void;
  onCancel: () => void;
  onDescriptionChange: (value: string) => void;
}

const ScenarioCard = ({
  scenario,
  isSelected,
  isEditing,
  editedDescription,
  scenarioColor,
  scenarioLabel,
  isLoaded,
  allowEditing,
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onDescriptionChange
}: ScenarioCardProps) => (
  <Box>
    <Tooltip title={isSelected ? "Click to deselect" : "Click to select"} placement="top">
      <div>
        <Paper
          elevation={isSelected ? 4 : 1}
          onClick={() => isLoaded && onSelect(scenario)}
          sx={{
            p: 3,
            borderRadius: 2,
            borderLeft: `6px solid ${scenarioColor}`,
            opacity: isLoaded ? 1 : 0.7,
            transition: 'all 0.3s ease',
            cursor: isLoaded ? 'pointer' : 'default',
            position: 'relative',
            '&:hover': {
              boxShadow: isLoaded ? 3 : 1,
              bgcolor: isLoaded ? 'rgba(0, 0, 0, 0.02)' : 'inherit',
            },
            ...(isSelected && {
              bgcolor: `${scenarioColor}10`,
              borderColor: scenarioColor,
              boxShadow: `0 0 8px ${scenarioColor}80`,
            }),
          }}
        >
          {!isLoaded && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                zIndex: 1,
                borderRadius: 2
              }}
            >
              <CircularProgress size={20} thickness={4} />
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 'bold',
                color: isSelected ? scenarioColor : 'text.primary',
                mb: 1
              }}
            >
              {scenarioLabel}
            </Typography>

            {allowEditing && isLoaded && (
              <Box>
                {isEditing ? (
                  <>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSave(scenario);
                      }}
                      sx={{ mr: 0.5 }}
                    >
                      <SaveIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel();
                      }}
                    >
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </>
                ) : (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(scenario);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            )}
          </Box>

          {isEditing ? (
            <TextField
              fullWidth
              multiline
              rows={3}
              value={editedDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              variant="outlined"
              size="small"
              sx={{ mb: 1 }}
            />
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                lineHeight: 1.6,
                fontSize: '0.9rem'
              }}
            >
              {scenario.description}
            </Typography>
          )}
        </Paper>
      </div>
    </Tooltip>
  </Box>
);

const ScenarioSpectrum = ({ 
  scenarios, 
  onSelectScenario, 
  onUpdateScenario,
  selectedScenarioId,
  party1Name = 'Party 1',
  party2Name = 'Party 2',
  loadedScenarios
}: ScenarioSpectrumProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scenarioPositions, setScenarioPositions] = useState<ScenarioPositions>({});
  const [, setHoveredScenario] = useState<string | null>(null);
  const [editingScenario, setEditingScenario] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>('');

  const {
    displayedScenarios,
    areScenariosLoading,
    hasNoScenarios
  } = useScenarioSpectrumData(scenarios, loadedScenarios);

  const scenarioTypeNames = useMemo(
    () => getScenarioTypeNames(party1Name, party2Name),
    [party1Name, party2Name]
  );

  const getScenarioName = (type: string, index: number) =>
    `Scenario ${index + 1}: ${scenarioTypeNames[type as keyof typeof scenarioTypeNames] || type}`;

  // Handle edit button click
  const handleEditClick = (scenario: Scenario) => {
    setEditingScenario(scenario.id);
    setEditedDescription(scenario.description);
  };

  // Handle save button click
  const handleSaveClick = (scenario: Scenario) => {
    if (onUpdateScenario && editedDescription.trim()) {
      onUpdateScenario({
        ...scenario,
        description: editedDescription.trim()
      });
    }
    setEditingScenario(null);
    setEditedDescription('');
  };

  // Handle cancel button click
  const handleCancelClick = () => {
    setEditingScenario(null);
    setEditedDescription('');
  };

  const handleSelectFromChart = useCallback((scenario: Scenario) => {
    onSelectScenario(scenario);
  }, [onSelectScenario]);

  useScenarioSpectrumChart({
    scenarios,
    selectedScenarioId,
    party1Name,
    party2Name,
    svgRef,
    setHoveredScenario,
    scenarioPositions,
    setScenarioPositions,
    onSelectScenario: handleSelectFromChart
  });

  const allowEditing = Boolean(onUpdateScenario);

  return (
    <Box ref={containerRef} sx={{ position: 'relative' }}>
      {/* Loading indicator */}
      {areScenariosLoading && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 10
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Generating scenarios...
            </Typography>
          </Box>
        </Box>
      )}

      {/* No scenarios message */}
      {hasNoScenarios ? (
        <Box 
          sx={{ 
            minHeight: 200, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            flexDirection: 'column',
            p: 3,
            textAlign: 'center',
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography variant="body1" color="text.secondary">
            No scenarios available for this issue.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please select a different issue or try regenerating scenarios.
          </Typography>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            {/* Spectrum visualization */}
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', color: 'text.primary', mb: 2 }}>
              Scenario Spectrum
            </Typography>
            <svg ref={svgRef} style={{ width: '100%', height: '120px' }} />
          </Paper>
          
          {/* Scenario boxes - vertically stacked */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayedScenarios.map((scenario, index) => {
              const isSelected = selectedScenarioId === scenario.id;
              const isEditing = editingScenario === scenario.id;
              const scenarioColor = getColorForType(scenario.type);
              const isLoaded = !loadedScenarios || loadedScenarios.includes(scenario.id);

              return (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isSelected={isSelected}
                  isEditing={isEditing}
                  editedDescription={editedDescription}
                  scenarioColor={scenarioColor}
                  scenarioLabel={getScenarioName(scenario.type, index)}
                  isLoaded={isLoaded}
                  allowEditing={allowEditing}
                  onSelect={onSelectScenario}
                  onEdit={handleEditClick}
                  onSave={handleSaveClick}
                  onCancel={handleCancelClick}
                  onDescriptionChange={setEditedDescription}
                />
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ScenarioSpectrum; 
