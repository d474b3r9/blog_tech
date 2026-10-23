// Contenu du CV. Modifier ici : la page /cv se met à jour toute seule.

export interface Mission {
  /** Client chez qui la mission a eu lieu (absent si l'employeur est le client). */
  client?: string;
  role: string;
  period: string;
  /** Ligne courte de contexte (projet ou contexte de la mission). */
  project: string;
  achievements: string[];
  stack: string[];
  /** Mission dépliée par défaut. */
  open?: boolean;
  /** Mission en cours : mise en avant visuelle. */
  current?: boolean;
  /** Lien optionnel (article, dépôt…) affiché sous la mission. */
  link?: { label: string; href: string };
}

export interface Employer {
  name: string;
  period: string;
  /** Poste occupé chez l'employeur. */
  role?: string;
  summary?: string;
  current?: boolean;
  /** Missions dépliées par défaut (sauf si `open` est défini sur la mission). */
  expanded?: boolean;
  missions: Mission[];
}

export const profile = {
  name: 'Jonathan Cattelain',
  title: 'Staff Engineer Data',
  summary:
    'Staff Engineer Data chez SFEIR, plus de 15 ans d’expérience. Je conçois et mets en place des data platforms de bout en bout sur GCP, AWS, Azure et Scaleway, avec gouvernance, observabilité et data platforms as code, en intégrant l’IA agentique (MCPs, skills, tools…) pour accélérer les cas d’usage. Google Cloud Certified Trainer, j’enseigne à IMT Atlantique, j’écris et je parle en conférences.',
  links: {
    linkedin: 'https://www.linkedin.com/in/jonathan-cattelain',
    linkedinLabel: 'linkedin.com/in/jonathan-cattelain',
    github: 'https://github.com/d474b3r9',
    githubLabel: 'github.com/d474b3r9',
    credly: 'https://www.credly.com/users/jonathan-cattelain',
    credlyLabel: 'credly.com/users/jonathan-cattelain',
  },
};

export const teaching = [
  {
    label: 'Enseignant, IMT Atlantique (ex-École des Mines Télécom Nantes)',
    detail: 'Cours de data et de cloud. Google Cloud Certified Trainer.',
    href: 'https://www.imt-atlantique.fr/fr/campus/sites/nantes',
    hrefLabel: 'Campus de Nantes',
  },
];

export const education = [
  { year: '2010', label: 'Licence en alternance en bases de données' },
  { year: '2009', label: 'DUT Service et Réseaux de Communications' },
];

export const certifications = [
  { year: '2025', label: 'Certified GCP data engineer x3' },
  { year: '2025', label: 'Certified dlt specialist & expert' },
  { year: '2023', label: 'Certified GCP trainer data' },
  { year: '2023', label: 'Certified GCP data engineer x2' },
  { year: '2021', label: 'Spark' },
  { year: '2020', label: 'Kafka & ELK' },
  { year: '2019', label: 'Certified GCP data engineer' },
  { year: '2019', label: 'Training CCA 175 Spark and Hadoop Developer' },
];

export const skills = [
  { label: 'Langages', items: ['Python', 'SQL'] },
  {
    label: 'Architecture & pratiques',
    items: [
      'FinOps',
      'Observabilité',
      'Gouvernance',
      'Architecte data',
      'Data platform / lakehouse',
      'Architecture médaillon',
      'Data as code',
    ],
  },
  {
    label: 'IA',
    items: ['IA générative', 'IA agentique', 'Multi-agents', 'MCP', 'Skills et tools', 'RAG', 'Prompt engineering'],
  },
  { label: 'Assistants et modèles', items: ['Claude Code', 'Copilot', 'Gemini', 'ChatGPT', 'LLMs open weight'] },
  { label: 'Frameworks et plateformes IA', items: ['Strands Agents', 'Amazon Bedrock'] },
  { label: 'Orchestration', items: ['Airflow', 'Dagster'] },
  { label: 'Qualité & catalogue', items: ['Elementary', 'OpenMetadata', 'SQLFluff'] },
  { label: 'Data warehouse', items: ['Snowflake', 'BigQuery', 'Databricks', 'Redshift', 'ClickHouse'] },
  { label: 'Cloud', items: ['GCP', 'AWS', 'Azure', 'Scaleway'] },
  { label: 'ETL / ELT', items: ['dlt', 'Airbyte', 'dbt', 'Matillion'] },
  { label: 'SGBD', items: ['SQL Server', 'MongoDB', 'ElasticSearch', 'MySQL', 'Oracle', 'PostgreSQL'] },
  { label: 'CI/CD', items: ['Docker', 'Kubernetes', 'CircleCI', 'GitLab CI', 'GitHub Actions'] },
  { label: 'Infra as code', items: ['Terraform', 'Terragrunt', 'YAML', 'Jinja', 'Helm'] },
  { label: 'BI', items: ['Power BI', 'Metabase'] },
  { label: 'IDE', items: ['PyCharm', 'VS Code', 'Orca (IDE agentique)'] },
  { label: 'OS', items: ['macOS', 'Windows', 'Linux'] },
  { label: 'Méthodologie', items: ['Scrum', 'Agile'] },
];

export const employers: Employer[] = [
  {
    name: 'SFEIR',
    expanded: true,
    role: 'Staff Engineer Data',
    period: 'Janv. 2023 – aujourd’hui',
    current: true,
    summary:
      'Architecte et référent data de SFEIR Ouest. Consultant, avant-vente, recrutement, formation, articles techniques et conférences.',
    missions: [
      {
        client: 'AS24',
        role: 'Senior Data Architect',
        period: 'Juin 2024 – aujourd’hui',
        project: 'Architecture data, mise en place de la data stack de bout en bout.',
        achievements: [
          'Création des 4 repos Terraform, containers, Airflow et dbt.',
          'Mise en place de la CI/CD et des 3 environnements AWS + Databricks.',
          'Création de l’usine à ingestion (dlt de dltHub) et de la transformation dbt.',
          'Centralisation et rationalisation de la donnée de toute l’entreprise.',
          'Conseil dans les phases d’idéation et de structuration des process et de l’équipe data.',
          'Création et amélioration continue de la data gouvernance.',
          'Mise en place d’une stack data as code, LLM ready.',
          'Conception de skills, d’outils MCP et d’un workflow agentiques pour accélérer les cas d’usage et améliorer la qualité, l’observabilité, la gouvernance et la documentation.',
          'Migration d’Airflow 2 vers Airflow 3.',
          'Architecture médaillon (bronze, silver, gold) sur Databricks.',
          'Observabilité data avec Elementary : monitoring des tests dbt, anomalies et fraîcheur.',
          'Déploiement d’OpenMetadata : catalogue, lineage et gouvernance.',
        ],
        stack: [
          'AWS',
          'Databricks',
          'Elementary',
          'OpenMetadata',
          'DynamoDB',
          'Terraform',
          'GitHub',
          'ECS',
          'ECR',
          'Python',
          'dlt',
          'dbt',
          'Power BI',
          'Airflow (MWAA)',
        ],
        open: true,
        current: true,
      },
      {
        client: 'POC Scaleway',
        role: 'Staff Engineer Data',
        period: '2026',
        project:
          'POC interne SFEIR. Conception et mise en place d’une stack data as code, LLM ready, souveraine sur Scaleway, 100 % européenne et open source.',
        achievements: [
          'Infrastructure as code avec Terraform et Helm.',
          'Kubernetes sur Scaleway Kapsule.',
          'Ingestion avec dlt vers du Parquet sur Object Storage.',
          'Orchestration avec Airflow 3 sur Kubernetes.',
          'Transformations dbt sur ClickHouse.',
          'Sécurité : SSO avec Keycloak, HTTPS, NetworkPolicies.',
          'Évaluation de Lakekeeper, Trino, Iceberg et Lightdash.',
        ],
        stack: ['Scaleway', 'Kubernetes', 'Terraform', 'Helm', 'dlt', 'Airflow 3', 'dbt', 'ClickHouse', 'Keycloak'],
        link: {
          label: 'Lire l’article sur sfeir.dev',
          href: 'https://www.sfeir.dev/cloud/jai-construit-une-data-stack-souveraine-et-voici-ce-que-jai-decouvert/',
        },
        open: true,
      },
      {
        client: 'Carrefour Assurances',
        role: 'Senior Data Architect',
        period: 'Nov. 2023 – Juin 2024',
        project: 'Architecture data, conseil et modernisation de la data stack.',
        achievements: [
          'Migration Airflow 1 vers Airflow 2.',
          'Accompagnement des métiers sur l’automatisation et la qualité des données.',
          'Consolidation de l’infrastructure.',
          'Amélioration de la qualité des données.',
        ],
        stack: [
          'GCP',
          'BigQuery',
          'Firebase',
          'GitLab',
          'Terraform',
          'Jenkins',
          'Cloud Run',
          'Python',
          'Flask-RESTX',
          'FastAPI',
          'Airflow',
          'Looker',
          'Power BI',
          'Pub/Sub',
        ],
      },
      {
        client: 'L’Oréal',
        role: 'Tech Lead Data',
        period: 'Mai 2023 – Oct. 2023',
        project: 'Tech lead du build/run de la data core team.',
        achievements: [
          'Améliorations d’APIs dans un environnement hybride Azure/GCP.',
          'Exposition de tous les produits data dans un portail d’APIs.',
        ],
        stack: [
          'GCP',
          'BigQuery',
          'Firebase',
          'GitLab',
          'Terraform',
          'Cloud Build',
          'Cloud Functions',
          'Azure',
          'Python',
          'Flask-RESTX',
          'FastAPI',
        ],
      },
      {
        client: 'RCA',
        role: 'Data Architect',
        period: 'Mars 2023 – Juil. 2023',
        project: 'Accompagnement de RCA sur l’évolution de sa data stack.',
        achievements: [
          'Audit de la data platform en place et préconisation de bonnes pratiques.',
          'POC de plusieurs solutions de CDC depuis l’application principale, puis mise en place.',
          'Accompagnement sur des problématiques Snowflake.',
        ],
        stack: ['AWS', 'Snowflake', 'PostgreSQL', 'GitLab', 'Terraform', 'Airbyte', 'DMS'],
      },
      {
        client: 'EP',
        role: 'Data Architect',
        period: 'Fév. 2023 – Juin 2023',
        project: 'Accompagnement d’EP sur la modernisation et la migration de sa data stack dans le cloud Azure.',
        achievements: [
          'Acculturation aux solutions modernes.',
          'Accompagnement pour la mise en place d’une stratégie data moderne et de la migration.',
          'Mise en place de Databricks et création d’un datalake.',
          'Accompagnement lors de la migration et prise en main de Databricks par l’équipe data (data scientists et data engineers).',
        ],
        stack: ['Azure', 'Databricks'],
      },
    ],
  },
  {
    name: 'Akeneo',
    expanded: true,
    period: 'Août 2022 – Déc. 2022',
    missions: [
      {
        role: 'Senior Data Engineer GCP',
        period: 'Août 2022 – Déc. 2022',
        project: 'Data engineering dans une équipe de data analysts. Gestion du run et des problèmes de production.',
        achievements: [
          'Rétro-ingénierie et documentation du cluster Kubernetes.',
          'Modifications liées à la sécurité des comptes de service pour Kubernetes.',
          'Debug des jobs en échec dans la chaîne de CI.',
          'Mise en place de SQLFluff pour dbt.',
          'Création de scripts dbt pour régler des problèmes de scalabilité.',
          'Formation Cloud Functions + Terraform.',
        ],
        stack: [
          'GCP (Storage, BigQuery, Compute, Functions, Pub/Sub, GKE, Container Registry)',
          'Dagster',
          'dbt',
          'Airbyte',
          'Docker',
          'Terraform',
          'Helm',
          'GitHub',
          'CircleCI',
          'Python',
        ],
        open: true,
      },
    ],
  },
  {
    name: 'Ippon',
    expanded: true,
    period: 'Août 2019 – Juil. 2022',
    summary: 'Consultant data auprès de clients, de la startup à la multinationale.',
    missions: [
      {
        client: 'Veolia',
        role: 'Data Consultant',
        period: 'Fév. 2022 – Juil. 2022',
        project:
          'Industrialisation de l’ingestion des KPI des usines du groupe et restitution dans un dashboard pour le Board.',
        achievements: [
          'Tech lead de 3 data engineers (juniors à seniors).',
          'Rétro-ingénierie, solidification, rationalisation et nettoyage de la chaîne de données existante.',
          'Documentation de l’existant.',
          'Dénormalisation du modèle de données existant.',
          'Remplacement et automatisation des briques legacy.',
          'Industrialisation de l’existant, automatisation des remontées et de l’ingestion des KPI.',
          'Création d’un dashboard pour le Board afin de piloter l’ensemble des usines de production Veolia.',
        ],
        stack: [
          'GCP (Storage, Compute, Functions, Pub/Sub, Composer, BigQuery, DataFusion)',
          'GitLab',
          'GitLab CI',
          'Python',
        ],
      },
      {
        client: 'Believe',
        role: 'Data Consultant',
        period: 'Janv. 2022',
        project: 'Conseils d’architecture BI.',
        achievements: [
          'Animation d’ateliers avec les différentes équipes pour comprendre leurs besoins, problèmes et attentes.',
          'Conseil autour de l’architecture des chaînes BI, de l’ingestion à la dataviz, sécurité comprise.',
          'Proposition d’architectures pour le board, avec schémas et coûts par solution.',
        ],
        stack: ['AWS', 'QuickSight', 'Power BI', 'Apache Superset'],
      },
      {
        client: 'Arrow',
        role: 'Data Consultant',
        period: 'Fév. 2021 – Déc. 2021',
        project: 'Mise en place de data pipelines et dashboards financiers.',
        achievements: [
          'Mise en place de data pipelines (ingestion, nettoyage, enrichissement, consolidation, scalabilité).',
          'Création et optimisation des règles métier à travers différents datasets.',
          'Création de dashboards pour le Board, le DAF et les contrôleurs de gestion.',
        ],
        stack: ['AWS (EC2, S3, Lambda, SQS, Athena)', 'Snowflake', 'Matillion', 'Power BI', 'Python'],
      },
      {
        client: 'BeMyApp',
        role: 'Data Consultant',
        period: 'Déc. 2020 – Janv. 2021',
        project: 'Mise en place du tracking des utilisateurs et d’un funnel de conversion.',
        achievements: [
          'Mise en place d’un data pipeline pour tracker les utilisateurs dans le respect du RGPD.',
          'Restitution du data funnel sur AWS QuickSight pour le CEO.',
        ],
        stack: ['AWS (S3, EC2, Lambda, SQS, QuickSight)', 'MongoDB Atlas', 'Node', 'React', 'Python'],
      },
      {
        client: 'Bureau Veritas',
        role: 'Data Consultant',
        period: 'Sept. 2020 – Nov. 2020',
        project: 'Tuning et industrialisation de scripts Glue PySpark.',
        achievements: [
          'Tuning des scripts PySpark sur AWS Glue.',
          'Industrialisation des scripts avec Terraform et Terragrunt.',
          'Support Redshift.',
        ],
        stack: ['AWS (Glue, Lambda, S3, Athena, Redshift)', 'Terraform', 'Terragrunt', 'GitLab', 'GitLab CI', 'Python'],
      },
      {
        client: 'Pernod Ricard',
        role: 'Data Consultant',
        period: 'Sept. 2019 – Août 2020',
        project: 'Mise en place de la gouvernance Power BI et Snowflake.',
        achievements: [
          'Mise en place d’un dashboard de pilotage des coûts Snowflake.',
          'Mise en place d’une gouvernance pour Power BI et Snowflake.',
          'Création de dashboards pour surveiller les coûts Snowflake et les performances, via l’API du cluster Power BI Premium à 3 nœuds.',
          'Mise en place des best practices Snowflake, documentation, automatisation et sécurisation du provisioning.',
        ],
        stack: [
          'Azure (Azure AD)',
          'AWS (DynamoDB, S3, Lambda, Athena, EC2)',
          'Matillion',
          'Snowflake',
          'Power BI Premium',
          'Apache Superset',
          'Python',
          'PowerShell',
        ],
      },
      {
        role: 'Activités transverses',
        period: '2019 – 2022',
        project:
          'Missions très riches dans des contextes variés, de la petite startup à la multinationale : data engineering, data analyst, dataviz, data gouvernance, FinOps, conseil, formateur, speaker, rédacteur, animateur, mentor, recruteur, tech lead.',
        achievements: [
          'Ingestion des données observées sur le réseau.',
          'Créations et améliorations d’architectures data AWS et GCP.',
          'Création et animation d’une formation d’entreprise SQL advanced analytics.',
          'Talks et ateliers techniques.',
          'Recrutement de nouveaux collaborateurs.',
          'Mentoring d’autres data engineers.',
        ],
        stack: [
          'AWS',
          'GCP',
          'Azure',
          'Snowflake',
          'BigQuery',
          'Redshift',
          'Athena',
          'Power BI',
          'Data Studio',
          'QuickSight',
          'Pub/Sub',
          'Kinesis',
          'Glue',
          'Airflow',
          'GitLab',
          'GitHub',
          'Terraform',
          'Terragrunt',
          'Python',
        ],
      },
    ],
  },
  {
    name: 'Linkbynet',
    period: 'Juin 2014 – Juil. 2019',
    summary: 'ESN spécialisée cloud et infogérance.',
    expanded: true,
    missions: [
      {
        client: 'Groupe Rocher',
        role: 'Data Engineer',
        period: 'Mai 2019 – Juil. 2019',
        project: 'Formation d’un datalab à BigQuery et dashboard FinOps des coûts GCP.',
        achievements: [],
        stack: ['GCP', 'BigQuery', 'Python'],
      },
      {
        client: 'Sodexo',
        role: 'Data Engineer',
        period: 'Mars 2019 – Avr. 2019',
        project: 'Industrialisation de scripts R sur une nouvelle plateforme Azure.',
        achievements: [],
        stack: ['Azure', 'R'],
      },
      {
        role: 'Data Engineer',
        period: 'Fév. 2019 – Juil. 2019',
        project: 'Avant-vente, conseil et architecture de solutions Big Data serverless.',
        achievements: ['Dataviz et rationalisation des factures AWS, GCP et Azure pour la refacturation.'],
        stack: ['AWS', 'GCP', 'Azure', 'Power BI', 'Python'],
      },
      {
        role: 'Tech Lead SQL Server',
        period: 'Juin 2014 – Janv. 2019',
        project: 'Référent technique SQL Server (N3), audits, conseil et migrations cloud. Encadrement d’équipes DBA.',
        achievements: ['Industrialisation des audits de performance et des migrations en Python.'],
        stack: ['SQL Server', 'Python', 'Azure', 'AWS', 'GCP'],
      },
    ],
  },
  {
    name: 'Crédit Agricole',
    period: 'Juil. 2013 – Mai 2014',
    missions: [
      {
        role: 'Manager / Tech Lead SQL Server',
        period: 'Juil. 2013 – Mai 2014',
        project: 'Référent technique SQL Server (N3) et encadrement d’une équipe DBA.',
        achievements: ['Refonte du toolkit SQL, recrutement et management de l’équipe.'],
        stack: ['SQL Server'],
      },
    ],
  },
  {
    name: 'Airbus',
    period: 'Sept. 2010 – Juin 2013',
    missions: [
      {
        role: 'Tech Lead SQL Server / DBA Oracle N2',
        period: 'Avr. 2011 – Juin 2013',
        project: 'Support Oracle (N2) et SQL Server (N3), puis tech lead SQL Server.',
        achievements: ['Audit mensuel de performance, en pairing avec un expert Microsoft.'],
        stack: ['SQL Server', 'Oracle', 'MySQL'],
      },
      {
        role: 'DBA SQL Server / Oracle N2',
        period: 'Sept. 2010 – Déc. 2010',
        project: 'Support Oracle et SQL Server, scripts KSH, migrations et montées en version.',
        achievements: [],
        stack: ['SQL Server', 'Oracle', 'MySQL'],
      },
    ],
  },
  {
    name: 'EDF',
    period: 'Fév. 2011 – Mars 2011',
    missions: [
      {
        role: 'DBA Oracle intégration',
        period: 'Fév. 2011 – Mars 2011',
        project: 'Intégration logicielle pour Linky : tests qualité Oracle.',
        achievements: [],
        stack: ['Oracle', 'AIX'],
      },
    ],
  },
  {
    name: 'bioMérieux',
    period: 'Août 2009 – Août 2010',
    missions: [
      {
        role: 'DBA',
        period: 'Août 2009 – Août 2010',
        project: 'Support Oracle, SQL Server, MySQL, DB2.',
        achievements: [
          'Refonte du monitoring des backups et de la CMDB en PHP, mise en place d’un Grid Control Oracle.',
        ],
        stack: ['Oracle', 'SQL Server', 'MySQL'],
      },
    ],
  },
];
