import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, 
  Clock, 
  MapPin, 
  Phone, 
  FileText, 
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Scale
} from 'lucide-react';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  timing: string;
  whatToBring: string[];
  whatHappens: string[];
  nextSteps: string[];
  legalBasis?: string[];
  forms?: { name: string; url: string }[];
}

interface ProcessFlow {
  id: string;
  title: string;
  description: string;
  category: 'dv' | 'family' | 'general';
  urgency: 'immediate' | 'urgent' | 'normal';
  steps: ProcessStep[];
  resources: {
    name: string;
    phone?: string;
    website?: string;
    address?: string;
    type: 'legal_aid' | 'support_service' | 'court' | 'police';
  }[];
}

const processFlows: ProcessFlow[] = [
  {
    id: 'report-dv',
    title: 'Reporting Domestic Violence',
    description: 'Step-by-step guide for reporting domestic violence to NSW Police',
    category: 'dv',
    urgency: 'immediate',
    steps: [
      {
        id: 'emergency',
        title: '1. Immediate Safety',
        description: 'If you are in immediate danger',
        timing: 'Right now',
        whatToBring: ['Nothing - your safety is priority'],
        whatHappens: [
          'Police will respond immediately',
          'They will ensure your safety',
          'Medical assistance if needed',
          'Initial statement may be taken'
        ],
        nextSteps: [
          'Call 000',
          'Stay on the line',
          'Follow police instructions'
        ],
        legalBasis: ['Law Enforcement (Powers and Responsibilities) Act 2002 (NSW)']
      },
      {
        id: 'police-station',
        title: '2. Make Formal Report',
        description: 'Visit police station to make detailed statement',
        timing: 'Within 24-48 hours when safe',
        whatToBring: [
          'Photo ID',
          'Any evidence (photos, messages, medical reports)',
          'Support person if desired',
          'List of incidents with dates'
        ],
        whatHappens: [
          'Police will take detailed statement',
          'Evidence will be recorded',
          'Risk assessment conducted',
          'Safety plan discussed',
          'AVO options explained'
        ],
        nextSteps: [
          'Police may arrest perpetrator',
          'AVO application may be made',
          'Reference number provided',
          'Follow-up contact arranged'
        ],
        legalBasis: [
          'Crimes (Domestic and Personal Violence) Act 2007 (NSW)',
          'Evidence Act 1995 (NSW)'
        ]
      }
    ],
    resources: [
      {
        name: 'NSW Police Force',
        phone: '000 (emergency) / 131 444 (non-emergency)',
        website: 'https://www.police.nsw.gov.au',
        type: 'police'
      },
      {
        name: "Women's Domestic Violence Court Advocacy Service",
        phone: '1800 810 784',
        website: 'https://www.wdvcas.org.au',
        type: 'support_service'
      },
      {
        name: 'Legal Aid NSW',
        phone: '1300 888 529',
        website: 'https://www.legalaid.nsw.gov.au',
        type: 'legal_aid'
      }
    ]
  },
  {
    id: 'avo-process',
    title: 'AVO Court Process',
    description: 'Understanding the AVO court process from first mention to final hearing',
    category: 'dv',
    urgency: 'urgent',
    steps: [
      {
        id: 'first-mention',
        title: '1. First Mention',
        description: 'Initial court appearance for AVO application',
        timing: '2-4 weeks after application',
        whatToBring: [
          'Court papers',
          'Photo ID',
          'Support person',
          'Any new evidence'
        ],
        whatHappens: [
          'Magistrate reads charges',
          'Defendant enters plea',
          'Interim AVO may be made',
          'Matter adjourned or heard',
          'Legal representation arranged'
        ],
        nextSteps: [
          'Interim AVO in place if granted',
          'Next court date set',
          'Service of documents',
          'Preparation for hearing'
        ],
        legalBasis: [
          'Crimes (Domestic and Personal Violence) Act 2007 (NSW) s 25',
          'Criminal Procedure Act 1986 (NSW)'
        ],
        forms: [
          {
            name: 'Application for AVO',
            url: 'https://www.localcourt.nsw.gov.au/forms'
          }
        ]
      },
      {
        id: 'final-hearing',
        title: '2. Final Hearing',
        description: 'Court decides whether to make final AVO',
        timing: '4-12 weeks after first mention',
        whatToBring: [
          'All evidence',
          'Witness statements',
          'Medical records if relevant',
          'Photos of injuries/damage'
        ],
        whatHappens: [
          'Evidence presented',
          'Witnesses may give evidence',
          'Cross-examination',
          'Magistrate makes decision',
          'Final AVO made or dismissed'
        ],
        nextSteps: [
          'AVO served on defendant if granted',
          'Conditions explained',
          'Breach consequences outlined',
          'Review date set if applicable'
        ],
        legalBasis: [
          'Crimes (Domestic and Personal Violence) Act 2007 (NSW) s 39',
          'Evidence Act 1995 (NSW)'
        ]
      }
    ],
    resources: [
      {
        name: 'Local Court of NSW',
        website: 'https://www.localcourt.nsw.gov.au',
        type: 'court'
      },
      {
        name: "Women's Domestic Violence Court Advocacy Service",
        phone: '1800 810 784',
        type: 'support_service'
      }
    ]
  },
  {
    id: 'parenting-orders',
    title: 'Applying for Parenting Orders',
    description: 'Federal Circuit and Family Court parenting order process',
    category: 'family',
    urgency: 'normal',
    steps: [
      {
        id: 'pre-action',
        title: '1. Pre-Action Requirements',
        description: 'Mandatory steps before filing application',
        timing: '1-3 months before filing',
        whatToBring: [
          'Family Dispute Resolution certificate',
          'Parenting plan if attempted',
          'Financial documents'
        ],
        whatHappens: [
          'Attend Family Dispute Resolution',
          'Attempt to reach agreement',
          'Obtain certificate to file',
          'Consider child impact'
        ],
        nextSteps: [
          'File application if no agreement',
          'Serve on other parent',
          'First court date listed'
        ],
        legalBasis: [
          'Family Law Act 1975 (Cth) s 60I',
          'Family Law Rules 2021 (Cth)'
        ],
        forms: [
          {
            name: 'Initiating Application (Parenting)',
            url: 'https://www.fcfcoa.gov.au/fl/forms'
          }
        ]
      }
    ],
    resources: [
      {
        name: 'Federal Circuit and Family Court',
        website: 'https://www.fcfcoa.gov.au',
        type: 'court'
      },
      {
        name: 'Family Relationships Online',
        website: 'https://www.familyrelationships.gov.au',
        type: 'support_service'
      }
    ]
  }
];

export default function PoliceProcessNavigator() {
  const [selectedFlow, setSelectedFlow] = useState<ProcessFlow | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'dv': return <Shield className="h-4 w-4" />;
      case 'family': return <FileText className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  if (selectedFlow) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setSelectedFlow(null)}>
            ← Back to Process Guide
          </Button>
          <Badge className={getUrgencyColor(selectedFlow.urgency)}>
            {selectedFlow.urgency.toUpperCase()}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getCategoryIcon(selectedFlow.category)}
              <span>{selectedFlow.title}</span>
            </CardTitle>
            <CardDescription>{selectedFlow.description}</CardDescription>
          </CardHeader>
        </Card>

        {/* Process Steps */}
        <div className="space-y-4">
          {selectedFlow.steps.map((step, idx) => (
            <Card key={step.id} className="border-l-4 border-l-primary">
              <Collapsible
                open={expandedStep === step.id}
                onOpenChange={(open) => setExpandedStep(open ? step.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{step.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {step.timing}
                        </Badge>
                        {expandedStep === step.id ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </div>
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-sm mb-2">What to bring:</h5>
                          <ul className="text-sm space-y-1">
                            {step.whatToBring.map((item, i) => (
                              <li key={i} className="flex items-center space-x-2">
                                <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="font-medium text-sm mb-2">What happens:</h5>
                          <ul className="text-sm space-y-1">
                            {step.whatHappens.map((item, i) => (
                              <li key={i} className="flex items-center space-x-2">
                                <Info className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-sm mb-2">Next steps:</h5>
                          <ul className="text-sm space-y-1">
                            {step.nextSteps.map((item, i) => (
                              <li key={i} className="flex items-center space-x-2">
                                <ChevronRight className="h-3 w-3 text-purple-600 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {step.legalBasis && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Legal basis:</h5>
                            <div className="space-y-1">
                              {step.legalBasis.map((law, i) => (
                                <Badge key={i} variant="secondary" className="text-xs mr-1 mb-1">
                                  {law}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {step.forms && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Required forms:</h5>
                            <div className="space-y-1">
                              {step.forms.map((form, i) => (
                                <div key={i}>
                                  <a 
                                    href={form.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span>{form.name}</span>
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Helpful Resources & Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {selectedFlow.resources.map((resource, idx) => (
                <div key={idx} className="p-3 border rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    {resource.type === 'legal_aid' && <Scale className="h-4 w-4 text-blue-600" />}
                    {resource.type === 'support_service' && <Phone className="h-4 w-4 text-green-600" />}
                    {resource.type === 'court' && <FileText className="h-4 w-4 text-purple-600" />}
                    {resource.type === 'police' && <Shield className="h-4 w-4 text-red-600" />}
                    <h6 className="font-medium text-sm">{resource.name}</h6>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {resource.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{resource.phone}</span>
                      </div>
                    )}
                    {resource.website && (
                      <div>
                        <a href={resource.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Visit website
                        </a>
                      </div>
                    )}
                    {resource.address && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{resource.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Police & Court Process Navigator</span>
          </CardTitle>
          <CardDescription>
            Step-by-step guides for NSW police reports, court procedures, and legal processes
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {processFlows.map((flow) => (
          <Card 
            key={flow.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedFlow(flow)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(flow.category)}
                  <div>
                    <CardTitle className="text-base">{flow.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {flow.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getUrgencyColor(flow.urgency)}>
                    {flow.urgency}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Emergency Notice */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Emergency Situations</h4>
              <p className="text-sm text-red-700 mt-1">
                If you are in immediate danger, call <strong>000</strong> for police, fire, or ambulance. 
                For crisis support, call Lifeline on <strong>13 11 14</strong> or 1800RESPECT on <strong>1800 737 732</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}