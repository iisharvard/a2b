import { useEffect, useRef, useState, ReactNode } from 'react';
import { Box, Typography, Paper, Grid, Chip, Collapse, Tooltip } from '@mui/material';
import * as d3 from 'd3';
import { Scenario, Component } from '../store/negotiationSlice';

interface ScenarioSpectrumProps {
  scenarios: Scenario[];
  onSelectScenario: (scenario: Scenario) => void;
  selectedScenarioId?: string;
  component?: Component;
  party1Name?: string;
  party2Name?: string;
  riskAssessmentContent?: ReactNode;
}

// Scenario type names mapping
const scenarioTypeNames = {
  'redline_violated_p1': 'Health for All (HfA) Redline Violated',
  'bottomline_violated_p1': 'Health for All (HfA) Bottomline Violated',
  'agreement_area': 'Agreement Area',
  'bottomline_violated_p2': 'Ministry of Health Bottomline Violated',
  'redline_violated_p2': 'Ministry of Health Redline Violated'
};

const ScenarioSpectrum = ({ 
  scenarios, 
  onSelectScenario, 
  selectedScenarioId,
  component,
  party1Name = 'Party 1',
  party2Name = 'Party 2',
  riskAssessmentContent
}: ScenarioSpectrumProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scenarioPositions, setScenarioPositions] = useState<{[key: string]: {x: number, y: number}}>({}); 
  
  // Get scenario by type
  const getScenarioByType = (type: string) => {
    return scenarios.find(s => s.type === type);
  };
  
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

  // Get scenario name based on type
  const getScenarioName = (type: string, index: number) => {
    return `Scenario ${index + 1}: ${scenarioTypeNames[type as keyof typeof scenarioTypeNames] || type}`;
  };
  
  useEffect(() => {
    if (!svgRef.current || scenarios.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = svgRef.current.clientWidth;
    const height = 60; // Reduced height
    const margin = { top: 10, right: 20, bottom: 10, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    
    // Create a scale for the spectrum
    const x = d3.scaleLinear()
      .domain([0, 4])  // 5 scenarios (0-4)
      .range([0, innerWidth]);
    
    // Create the main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Draw the line
    g.append("line")
      .attr("x1", 0)
      .attr("y1", 30)
      .attr("x2", innerWidth)
      .attr("y2", 30)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 3);
    
    // Draw the scenario points
    const circles = g.selectAll("circle")
      .data(scenarios)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => x(i))
      .attr("cy", 30)
      .attr("r", 10)
      .attr("fill", d => getColorForType(d.type))
      .attr("stroke", d => selectedScenarioId === d.id ? "#000" : "none")
      .attr("stroke-width", 2)
      .attr("class", d => `scenario-point-${d.id}`) // Add class for connecting lines
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        onSelectScenario(d);
      });
    
    // Add small labels for the points (just numbers 1-5)
    g.selectAll("text.point-label")
      .data(scenarios)
      .enter()
      .append("text")
      .attr("class", "point-label")
      .attr("x", (d, i) => x(i))
      .attr("y", 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#000")
      .style("font-size", "9px") // Decreased font size
      .text((d, i) => i + 1);
    
    // Store the positions of the circles for connecting lines
    const positions: {[key: string]: {x: number, y: number}} = {};
    scenarios.forEach((scenario, i) => {
      positions[scenario.id] = {
        x: x(i) + margin.left,
        y: 30 + margin.top
      };
    });
    setScenarioPositions(positions);
    
  }, [scenarios, selectedScenarioId, party1Name, party2Name]);
  
  // Draw connecting line when a scenario is selected
  useEffect(() => {
    if (!selectedScenarioId || !containerRef.current) return;
    
    // Remove any existing connecting lines
    const container = containerRef.current;
    const existingLines = container.querySelectorAll('.connecting-line');
    existingLines.forEach(line => line.remove());
    
    // Get the position of the selected dot
    const dotPosition = scenarioPositions[selectedScenarioId];
    if (!dotPosition) return;
    
    // Get the position of the selected scenario box
    const scenarioBox = container.querySelector(`#scenario-box-${selectedScenarioId}`);
    if (!scenarioBox) return;
    
    // Get the position of the scenario box relative to the container
    const boxRect = scenarioBox.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate the position for the line
    const startX = dotPosition.x;
    const startY = dotPosition.y;
    const endX = boxRect.left - containerRect.left + 8; // 8px is half the width of the dot in the scenario box
    const endY = boxRect.top - containerRect.top + 8; // 8px is half the height of the dot in the scenario box
    
    // Create an SVG overlay for the connecting line
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'connecting-line');
    svg.setAttribute('style', 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;');
    
    // Create the path for the connecting line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
    if (!selectedScenario) return;
    
    const color = getColorForType(selectedScenario.type);
    
    // Create a curved path from the dot to the scenario box
    const midX = (startX + endX) / 2;
    const pathData = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-dasharray', '4');
    
    svg.appendChild(path);
    container.appendChild(svg);
    
  }, [selectedScenarioId, scenarioPositions, scenarios]);
  
  return (
    <Box ref={containerRef} sx={{ position: 'relative' }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        {/* Spectrum visualization */}
        <svg ref={svgRef} width="100%" height="60"></svg>
      </Paper>
      
      {/* Scenario boxes - now vertically stacked */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {scenarios.map((scenario, index) => {
          const isSelected = selectedScenarioId === scenario.id;
          
          return (
            <Box key={scenario.id}>
              <Tooltip title={isSelected ? "Click to deselect" : ""} placement="top">
                <div>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2,
                      cursor: 'pointer',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderWidth: isSelected ? 2 : 1,
                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                      opacity: selectedScenarioId && !isSelected ? 0.6 : 1,
                      transition: 'opacity 0.3s, border-color 0.3s, background-color 0.3s',
                      position: 'relative',
                      '&:hover': {
                        opacity: 1,
                        borderColor: isSelected ? 'primary.dark' : 'primary.light',
                        bgcolor: isSelected ? 'action.hover' : 'background.paper',
                      }
                    }}
                    onClick={() => onSelectScenario(scenario)}
                    id={`scenario-box-${scenario.id}`}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          bgcolor: getColorForType(scenario.type),
                          mr: 1,
                          border: isSelected ? '2px solid black' : 'none'
                        }} 
                      />
                      <Typography variant="subtitle2" sx={{ 
                        color: getColorForType(scenario.type),
                        fontWeight: 'bold',
                        fontSize: '0.85rem' // Decreased font size
                      }}>
                        {getScenarioName(scenario.type, index)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', pl: 3 }}> {/* Decreased font size and added left padding */}
                      {scenario.description}
                    </Typography>
                  </Paper>
                </div>
              </Tooltip>
              
              {/* Risk Assessment Content - only show for selected scenario */}
              {isSelected && riskAssessmentContent && (
                <Box 
                  sx={{ 
                    ml: 4, // Indent to create scaffolded appearance
                    mt: 1, 
                    borderLeft: `2px solid ${getColorForType(scenario.type)}`,
                    pl: 2
                  }}
                >
                  {riskAssessmentContent}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ScenarioSpectrum; 