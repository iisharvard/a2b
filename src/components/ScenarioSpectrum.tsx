import { useEffect, useRef, useState, ReactNode } from 'react';
import { Box, Typography, Paper, Tooltip, Collapse, TextField, IconButton, CircularProgress } from '@mui/material';
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
  const [scenarioPositions, setScenarioPositions] = useState<{[key: string]: {x: number, y: number}}>({}); 
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);
  const [editingScenario, setEditingScenario] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>('');
  
  // Filter out invalid scenarios
  const validScenarios = scenarios.filter(scenario => {
    return (
      scenario.type !== undefined && 
      scenario.description?.trim() !== '' &&
      // Filter out placeholder scenarios (if any)
      !scenario.description?.includes('placeholder')
    );
  });

  // Track if scenarios are currently loading
  const areScenariosLoading = loadedScenarios && 
    scenarios.length > 0 && 
    scenarios.some(s => !loadedScenarios.includes(s.id));

  // Ensure we have exactly 5 scenarios maximum
  const displayedScenarios = validScenarios.slice(0, 5);

  // Check if we have no scenarios to display
  const hasNoScenarios = displayedScenarios.length === 0 && !areScenariosLoading;

  // Get scenario type names with current party names
  const scenarioTypeNames = getScenarioTypeNames(party1Name, party2Name);

  // Get scenario name based on type
  const getScenarioName = (type: string, index: number) => {
    return `Scenario ${index + 1}: ${scenarioTypeNames[type as keyof typeof scenarioTypeNames] || type}`;
  };

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

  useEffect(() => {
    if (!svgRef.current || scenarios.length === 0) return;
    
    const width = svgRef.current.clientWidth;
    const height = 120;
    const margin = { top: 20, right: 20, bottom: 30, left: 20 };

    // Clear existing content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Always show 5 fixed positions for the spectrum
    const scenarioCount = 5;
    
    // Create scale - reversed order again
    const xScale = d3.scaleLinear()
      .domain([0, scenarioCount - 1])
      .range([width - margin.right, margin.left]);

    // Add risk label - moved higher and aligned left with arrow
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", 15)
      .attr("text-anchor", "start")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(`Increasing risk for ${party2Name} →`);  // Added arrow

    // Create the spectrum line group
    const spectrumGroup = svg.append("g")
      .attr("transform", `translate(0, ${height/2})`);

    // Add "Zone of Possible Agreement" background
    const zopaWidth = (xScale(1) - xScale(3)); // Positions 2,3,4 in reversed order
    spectrumGroup.append("rect")
      .attr("x", xScale(3))
      .attr("y", -15)
      .attr("width", zopaWidth)
      .attr("height", 30)
      .attr("fill", "rgba(0, 255, 0, 0.1)")
      .attr("rx", 15);

    // Add ZOPA label
    svg.append("text")
      .attr("x", xScale(2))
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .attr("font-size", "10px")
      .text("Zone of Possible Agreement");

    // Add horizontal line
    spectrumGroup.append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2);

    // Ensure we handle up to 5 scenarios consistently
    const displayScenarios = scenarios.slice(0, 5).map((scenario, index) => ({
      ...scenario,
      displayNumber: index + 1
    }));
    
    // Fill with empty scenarios if we have less than 5
    while (displayScenarios.length < 5) {
      displayScenarios.push({
        id: `placeholder-${displayScenarios.length}`,
        componentId: '',
        type: 'agreement_area',
        displayNumber: displayScenarios.length + 1,
        description: ''
      });
    }
    
    // Reverse order for display
    const reversedScenarios = [...displayScenarios].reverse();

    // Add dots for each scenario
    spectrumGroup.selectAll("circle")
      .data(reversedScenarios)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => xScale(i))
      .attr("cy", 0)
      .attr("r", d => d.id === selectedScenarioId ? 8 : 6)
      .attr("fill", d => {
        // Skip placeholder scenarios
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
      .on("click", (event, d) => {
        if (!d.id.startsWith('placeholder')) {
          onSelectScenario(d);
        }
      })
      .on("mouseover", (event, d) => {
        if (!d.id.startsWith('placeholder')) {
          setHoveredScenario(d.id);
        }
      })
      .on("mouseout", () => setHoveredScenario(null));

    // Add scenario numbers
    spectrumGroup.selectAll("text.scenario-number")
      .data(reversedScenarios)
      .enter()
      .append("text")
      .attr("class", "scenario-number")
      .attr("x", (d, i) => xScale(i))
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("fill", d => d.id.startsWith('placeholder') ? '#ccc' : "#666")
      .attr("font-size", "12px")
      .text((d, i) => 5 - i);  // Display 5,4,3,2,1

    // Add labels - party1 on left, party2 on right
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", height - 5)
      .attr("text-anchor", "start")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(party1Name);  // Changed to party1Name

    svg.append("text")
      .attr("x", width - margin.right)
      .attr("y", height - 5)
      .attr("text-anchor", "end")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(party2Name);  // Changed to party2Name

    // Calculate scenario positions but only update state if they've changed
    const positions: {[key: string]: {x: number, y: number}} = {};
    
    // Use displayScenarios.slice() to avoid modifying the original array
    displayScenarios.forEach((scenario, i) => {
      if (!scenario.id.startsWith('placeholder')) {
        positions[scenario.id] = {
          x: xScale(4 - i) + margin.left, // Reversed order: 4-i gives 4,3,2,1,0
          y: 30 + margin.top
        };
      }
    });
    
    // Compare with existing positions to avoid unnecessary state updates
    let positionsChanged = false;
    
    // Check if any positions are different or if we have a different number of scenarios
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
    
    // Only update state if positions have changed
    if (positionsChanged) {
      // Use a function form of setState to avoid including scenarioPositions in dependencies
      setScenarioPositions(() => positions);
    }
    
  // Remove scenarioPositions from dependencies to prevent infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios, selectedScenarioId, party1Name, party2Name]);
  
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
                <Box key={scenario.id}>
                  <Tooltip title={isSelected ? "Click to deselect" : "Click to select"} placement="top">
                    <div>
                      <Paper
                        elevation={isSelected ? 4 : 1}
                        onClick={() => isLoaded && onSelectScenario(scenario)}
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
                            {getScenarioName(scenario.type, index)}
                          </Typography>
                          
                          {onUpdateScenario && isLoaded && (
                            <Box>
                              {isEditing ? (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveClick(scenario);
                                    }}
                                    sx={{ mr: 0.5 }}
                                  >
                                    <SaveIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelClick();
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
                                    handleEditClick(scenario);
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
                            onChange={(e) => setEditedDescription(e.target.value)}
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
            })}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ScenarioSpectrum; 