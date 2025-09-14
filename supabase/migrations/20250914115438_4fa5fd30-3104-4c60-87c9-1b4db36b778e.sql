-- Populate sample NSW legal sections for testing

-- First, get the document IDs
DO $$
DECLARE
    crimes_act_id UUID;
    dv_act_id UUID;
    family_act_id UUID;
BEGIN
    -- Get document IDs
    SELECT id INTO crimes_act_id FROM legal_documents WHERE title = 'Crimes Act 1900 (NSW)';
    SELECT id INTO dv_act_id FROM legal_documents WHERE title = 'Crimes (Domestic and Personal Violence) Act 2007 (NSW)';
    SELECT id INTO family_act_id FROM legal_documents WHERE title = 'Family Law Act 1975 (Commonwealth)';

    -- Insert detailed legal sections for Crimes Act - Coercive Control
    INSERT INTO legal_sections (
        document_id, section_number, section_type, title, content, 
        level, order_index, citation_reference, legal_concepts
    ) VALUES 
    (crimes_act_id, '54D', 'section', 'Coercive control', 
     'A person who uses coercive or controlling behaviour towards another person with whom the person is or was in an intimate personal relationship commits an offence if the behaviour would cause a reasonable person in the position of the other person to fear that violence will be used, or to be seriously alarmed or seriously distressed. Maximum penalty: imprisonment for 7 years. The behaviour must consist of a pattern of behaviour, and the pattern must be such as would cause a reasonable person in the position of the other person to fear that violence will be used against them or another person, or to be seriously alarmed or seriously distressed. This section applies to behaviour that occurs after the commencement of this section.', 
     1, 1, 's 54D Crimes Act 1900 (NSW)', 
     ARRAY['coercive control', 'domestic violence', 'criminal offence', 'intimate relationship', 'pattern behaviour', 'violence', 'emotional abuse']),
     
    (crimes_act_id, '54E', 'section', 'What constitutes coercive or controlling behaviour', 
     'Coercive or controlling behaviour includes (but is not limited to) behaviour that is directed towards a person (the victim) that: (a) isolates the victim from friends, relatives or other persons, (b) controls, regulates or monitors the victim''s day-to-day activities, (c) deprives the victim of, or restricts the victim''s, freedom of action, (d) frightens, humiliates, degrades or punishes the victim, (e) controls, regulates or monitors the victim''s communication with friends, relatives or other persons (including by monitoring or blocking the victim''s access to communication devices), (f) controls or regulates the victim in relation to the victim''s finances, (g) controls or regulates the victim in relation to the victim''s employment.', 
     1, 2, 's 54E Crimes Act 1900 (NSW)', 
     ARRAY['coercive behaviour', 'controlling behaviour', 'isolation', 'monitoring', 'financial control', 'employment control', 'communication control']),

    (crimes_act_id, '54F', 'section', 'Defences', 
     'It is a defence to a prosecution for an offence under section 54D if the defendant''s behaviour was reasonable in all the circumstances. Without limiting subsection (1), behaviour may be reasonable if it was engaged in for the purpose of: (a) protecting the health or safety of a person, or (b) protecting a person who has a cognitive or mental impairment.', 
     1, 3, 's 54F Crimes Act 1900 (NSW)', 
     ARRAY['defence', 'reasonable behaviour', 'protection', 'safety', 'cognitive impairment']);

    -- Insert sections for DV Act - ADVOs
    INSERT INTO legal_sections (
        document_id, section_number, section_type, title, content, 
        level, order_index, citation_reference, legal_concepts
    ) VALUES 
    (dv_act_id, '16', 'section', 'Grounds for making apprehended domestic violence order', 
     'An apprehended domestic violence order may be made against a person if the court is satisfied that the person against whom the order is sought has or may have committed a domestic violence offence against the person seeking protection, or if the court is satisfied that such an order is necessary or desirable to ensure the safety and protection of the person seeking protection or to prevent the continuance or repetition of domestic violence by the person against whom the order is sought.', 
     1, 1, 's 16 Crimes (Domestic and Personal Violence) Act 2007 (NSW)', 
     ARRAY['ADVO', 'domestic violence order', 'grounds', 'safety', 'protection', 'court order']),

    (dv_act_id, '35', 'section', 'Standard apprehended violence order conditions', 
     'An apprehended violence order (other than a workplace violence order) is subject to the condition that the defendant must not: (a) assault, molest, harass, threaten or otherwise interfere with the protected person or a person who has a domestic relationship with the protected person, and (b) intimidate or stalk the protected person or a person who has a domestic relationship with the protected person. A court may specify additional conditions in an apprehended violence order that it considers necessary or desirable.', 
     1, 2, 's 35 Crimes (Domestic and Personal Violence) Act 2007 (NSW)', 
     ARRAY['ADVO conditions', 'standard conditions', 'assault', 'harassment', 'intimidation', 'stalking']);

    -- Update document section counts
    UPDATE legal_documents SET total_sections = (
        SELECT COUNT(*) FROM legal_sections WHERE document_id = legal_documents.id
    );

END $$;