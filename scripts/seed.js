const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sre_platform',
});

async function main() {
  console.log('Starting seed...');

  try {
    // Create mock users
    const users = [
      { email: 'manager@example.com', name: 'Manager on Duty' },
      { email: 'alice.johnson@company.com', name: 'Alice Johnson' },
      { email: 'bob.smith@company.com', name: 'Bob Smith' },
      { email: 'carol.williams@company.com', name: 'Carol Williams' },
      { email: 'david.brown@company.com', name: 'David Brown' },
      { email: 'emma.davis@company.com', name: 'Emma Davis' },
      { email: 'frank.miller@company.com', name: 'Frank Miller' },
      { email: 'grace.wilson@company.com', name: 'Grace Wilson' },
      { email: 'henry.moore@company.com', name: 'Henry Moore' },
      { email: 'iris.taylor@company.com', name: 'Iris Taylor' },
      { email: 'jack.anderson@company.com', name: 'Jack Anderson' },
    ];

    const userIds = {};
    for (const user of users) {
      const userResult = await pool.query(
        `INSERT INTO users (email, name)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET name = $2
         RETURNING *`,
        [user.email, user.name]
      );
      console.log('Created user:', userResult.rows[0].name);
      userIds[user.email] = userResult.rows[0].id;
    }

    // Create mock runbooks
    const runbooks = [
      {
        serviceName: 'Payment API',
        teamName: 'Payments',
        teamEmail: 'payments@example.com',
        description: 'Handles all payment processing, including credit card transactions, refunds, and payment method management. Critical service for revenue operations.',
      },
      {
        serviceName: 'User Auth API',
        teamName: 'Identity',
        teamEmail: 'identity@example.com',
        description: 'Authentication and authorization service managing user sessions, OAuth flows, and access tokens. Handles SSO integration and multi-factor authentication.',
      },
      {
        serviceName: 'Notification Service',
        teamName: 'Communications',
        teamEmail: 'comms@example.com',
        description: 'Multi-channel notification delivery system supporting email, SMS, push notifications, and in-app messages.',
      },
      {
        serviceName: 'Order Processing API',
        teamName: 'Commerce',
        teamEmail: 'commerce@example.com',
        description: 'Core order management system handling order creation, updates, cancellations, and fulfillment workflows.',
      },
      {
        serviceName: 'Inventory API',
        teamName: 'Commerce',
        teamEmail: 'commerce@example.com',
        description: 'Real-time inventory management tracking stock levels, reservations, and warehouse operations.',
      },
      {
        serviceName: 'Analytics API',
        teamName: 'Data',
        teamEmail: 'data@example.com',
        description: 'Data aggregation and analytics service providing business metrics, user behavior insights, and reporting capabilities.',
      },
      {
        serviceName: 'Search API',
        teamName: 'Discovery',
        teamEmail: 'discovery@example.com',
        description: 'Elasticsearch-based search service providing product search, filtering, and recommendations.',
      },
      {
        serviceName: 'Recommendation Engine',
        teamName: 'Discovery',
        teamEmail: 'discovery@example.com',
        description: 'Machine learning-powered recommendation system providing personalized product suggestions.',
      },
      {
        serviceName: 'Email Service',
        teamName: 'Communications',
        teamEmail: 'comms@example.com',
        description: 'Dedicated email delivery service managing transactional and marketing emails.',
      },
      {
        serviceName: 'Billing API',
        teamName: 'Payments',
        teamEmail: 'payments@example.com',
        description: 'Subscription and billing management service handling recurring payments, invoicing, and revenue recognition.',
      },
    ];

    const runbookIds = {};
    for (const runbook of runbooks) {
      const result = await pool.query(
        `INSERT INTO runbooks (service_name, team_name, team_email, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (service_name) DO UPDATE 
         SET team_name = $2, team_email = $3, description = $4
         RETURNING *`,
        [runbook.serviceName, runbook.teamName, runbook.teamEmail, runbook.description]
      );
      console.log('Created runbook:', result.rows[0].service_name);
      runbookIds[runbook.serviceName] = result.rows[0].id;
    }

    // ============================================================================
    // INCIDENT 1: Database Disaster Recovery Test Gone Wrong
    // ============================================================================
    console.log('Creating Incident 1: Database DR Test Gone Wrong...');
    
    const incident1Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2024-001',
        'Production Database Outage - DR Test Executed on Wrong Environment',
        'Critical production database outage caused by disaster recovery test script accidentally executed against production environment instead of staging. All write operations failed for 2 hours and 15 minutes affecting payment processing, order creation, and user authentication.',
        'critical',
        'resolved',
        userIds['alice.johnson@company.com'],
        userIds['bob.smith@company.com'],
        '2024-11-15T14:23:00Z',
        '2024-11-15T14:23:00Z',
        '2024-11-15T16:15:00Z',
        '2024-11-15T16:38:00Z',
        '2024-11-15T18:00:00Z',
        `At 14:23 UTC on November 15, 2024, our production PostgreSQL database cluster experienced a complete outage when a disaster recovery (DR) test script was inadvertently executed against the production environment instead of the staging environment.

The DR test script performed the following actions:
1. Initiated a controlled failover to the standby replica
2. Promoted the standby to primary
3. Reconfigured connection strings to point to the new primary
4. Attempted to demote the old primary to standby

However, the script contained a critical flaw: it did not properly validate the target environment before execution. When run against production, it caused:
- The production primary database to be demoted while still serving live traffic
- Connection pool exhaustion as applications attempted to reconnect
- Replication lag of 45 seconds on the newly promoted primary
- Loss of in-flight transactions during the failover window
- Cascading failures across all services dependent on the database

The incident was detected when monitoring alerts fired for:
- Database connection failures (>95% error rate)
- Payment API 500 errors spiking to 100%
- Order Processing API unable to create new orders
- User authentication failures preventing logins`,
        `**Customer Impact:**
- 2 hours 15 minutes of complete service degradation
- 100% of payment transactions failed (estimated 3,247 failed transactions)
- 100% of new order creation failed (estimated 1,892 lost orders)
- 87% of user login attempts failed
- Customer support ticket volume increased by 340%
- Estimated revenue loss: $487,000

**Business Impact:**
- Payment processing completely unavailable
- Order fulfillment pipeline stalled
- Customer trust significantly impacted
- Negative social media sentiment spike
- Emergency communications sent to all customers
- Executive escalation to C-level

**Technical Impact:**
- All write operations to production database failed
- Read operations degraded due to replication lag
- Connection pool exhaustion across 47 application instances
- Database replication broken requiring manual intervention
- Monitoring system overwhelmed with alerts (2,847 alerts fired)
- On-call engineers paged across 4 teams

**Affected Services:**
- Payment API (100% failure rate)
- Order Processing API (100% failure rate)
- Billing API (100% failure rate)
- User Auth API (87% failure rate)
- Inventory API (read-only mode)
- Notification Service (delayed by 2+ hours)`,
        `**Root Cause:**
The disaster recovery test script lacked proper environment validation and safeguards. The script relied solely on an environment variable (DB_ENVIRONMENT) to determine the target database, but this variable was not set in the execution context, causing it to default to the production connection string.

**Contributing Factors:**
1. **Insufficient Safeguards:** No confirmation prompt or dry-run mode in the DR script
2. **Missing Environment Validation:** Script did not verify it was running against non-production
3. **Inadequate Access Controls:** Production database credentials were accessible from staging environment
4. **Human Error:** Engineer executed script from wrong terminal window
5. **Lack of Testing:** DR script had never been tested in a safe environment
6. **Documentation Gap:** Runbook did not emphasize environment verification steps
7. **No Circuit Breaker:** Database failover process had no rollback mechanism
8. **Monitoring Blind Spot:** No alerts for unexpected database topology changes

**Timeline of Failure:**
- 14:23:00 - Script execution began against production
- 14:23:15 - Primary database demoted, connection failures started
- 14:23:30 - Standby promoted to primary with 45s replication lag
- 14:24:00 - Application connection pools exhausted
- 14:25:00 - Cascading failures across all services
- 14:26:00 - Incident declared, war room established`,
        `**Immediate Mitigation (14:23 - 16:15):**
1. Incident declared at 14:26 UTC, war room established
2. Identified root cause: DR script executed on production (14:35)
3. Stopped the DR script execution immediately
4. Assessed database cluster state and replication status
5. Identified the original primary was still healthy but demoted
6. Made decision to fail back to original primary to restore service
7. Manually promoted original primary back to primary role (15:45)
8. Restarted application connection pools across all services (15:50)
9. Verified replication was functioning correctly (16:00)
10. Monitored error rates returning to normal (16:15)
11. Service fully restored and incident mitigated

**Full Resolution (16:15 - 16:38):**
1. Verified all database connections stable
2. Confirmed replication lag returned to <1 second
3. Validated data consistency across primary and replicas
4. Ran data integrity checks on critical tables
5. Verified no data corruption occurred
6. Confirmed all services operating normally
7. Reviewed and processed queued transactions
8. Incident marked as resolved at 16:38 UTC

**Post-Incident Actions (16:38 - 18:00):**
1. Customer communication sent explaining the outage
2. Detailed incident timeline documented
3. Affected customer orders manually processed
4. Failed payment transactions identified for retry
5. Post-mortem scheduled for next business day
6. Incident closed at 18:00 UTC after final verification`
      ]
    );
    
    const incident1Id = incident1Result.rows[0].id;
    console.log('Created Incident 1:', incident1Result.rows[0].incident_number);

    // Timeline events for Incident 1
    const incident1Timeline = [
      { type: 'detected', desc: 'Database connection failures detected. Payment API returning 500 errors at 95%+ rate.', user: 'bob.smith@company.com', time: '2024-11-15T14:23:00Z' },
      { type: 'investigation', desc: 'War room established. Investigating database cluster status. Identified unexpected failover in progress.', user: 'alice.johnson@company.com', time: '2024-11-15T14:26:00Z' },
      { type: 'investigation', desc: 'Root cause identified: DR test script was accidentally executed against production database instead of staging.', user: 'alice.johnson@company.com', time: '2024-11-15T14:35:00Z' },
      { type: 'action', desc: 'Stopped DR script execution. Assessing database cluster state to determine safest recovery path.', user: 'carol.williams@company.com', time: '2024-11-15T14:40:00Z' },
      { type: 'action', desc: 'Decision made to fail back to original primary. Original primary confirmed healthy with no data loss.', user: 'alice.johnson@company.com', time: '2024-11-15T15:30:00Z' },
      { type: 'action', desc: 'Manually promoting original primary back to primary role. Reconfiguring replication.', user: 'carol.williams@company.com', time: '2024-11-15T15:45:00Z' },
      { type: 'action', desc: 'Restarting application connection pools across all services. Monitoring error rates.', user: 'david.brown@company.com', time: '2024-11-15T15:50:00Z' },
      { type: 'mitigated', desc: 'Service restored. Database connections stable. Error rates returning to normal. Replication lag <1s.', user: 'alice.johnson@company.com', time: '2024-11-15T16:15:00Z' },
      { type: 'resolved', desc: 'All systems verified operational. Data integrity checks passed. No data corruption detected. Incident resolved.', user: 'alice.johnson@company.com', time: '2024-11-15T16:38:00Z' },
      { type: 'communication', desc: 'Customer communication sent explaining the outage and apologizing for the disruption.', user: 'emma.davis@company.com', time: '2024-11-15T17:00:00Z' },
    ];

    for (const event of incident1Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident1Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 1
    const incident1Actions = [
      { desc: 'Add environment validation checks to all DR scripts with mandatory confirmation prompts', user: 'carol.williams@company.com', completed: true },
      { desc: 'Implement production database access restrictions - remove prod credentials from staging', user: 'david.brown@company.com', completed: true },
      { desc: 'Create automated DR testing framework that only works in non-production environments', user: 'carol.williams@company.com', completed: false },
      { desc: 'Add database topology change alerts to monitoring system', user: 'frank.miller@company.com', completed: true },
      { desc: 'Implement circuit breaker for database failover with automatic rollback capability', user: 'carol.williams@company.com', completed: false },
      { desc: 'Update all runbooks to include explicit environment verification steps', user: 'alice.johnson@company.com', completed: true },
      { desc: 'Conduct DR drill in staging environment and document lessons learned', user: 'alice.johnson@company.com', completed: true },
      { desc: 'Process failed payment transactions and reach out to affected customers', user: 'emma.davis@company.com', completed: true },
    ];

    for (const action of incident1Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident1Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 1
    const incident1Services = ['Payment API', 'Order Processing API', 'Billing API', 'User Auth API'];
    for (const serviceName of incident1Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident1Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 1 with timeline and action items');

    // ============================================================================
    // INCIDENT 2: Network Connectivity Issues
    // ============================================================================
    console.log('Creating Incident 2: Network Connectivity Issues...');
    
    const incident2Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2024-002',
        'Multi-Region Network Outage - BGP Route Leak from ISP',
        'Severe network connectivity issues affecting multiple AWS regions due to BGP route leak from upstream ISP. Services experienced intermittent connectivity, high latency (5000ms+), and packet loss (40-60%). Incident lasted 3 hours and 42 minutes with cascading failures across microservices architecture.',
        'critical',
        'resolved',
        userIds['david.brown@company.com'],
        userIds['frank.miller@company.com'],
        '2024-12-03T09:15:00Z',
        '2024-12-03T09:15:00Z',
        '2024-12-03T11:45:00Z',
        '2024-12-03T12:57:00Z',
        '2024-12-03T14:00:00Z',
        `At 09:15 UTC on December 3, 2024, our infrastructure experienced severe network connectivity issues affecting services across multiple AWS regions (us-east-1, eu-west-1, and ap-southeast-1). The root cause was traced to a BGP route leak from our upstream ISP (Tier-1 provider) that caused massive routing instability.

**What Happened:**
Our monitoring systems detected a sudden spike in network latency and packet loss across all regions simultaneously. Initial symptoms included:
- API response times increased from 50ms average to 5000ms+
- Packet loss between 40-60% on inter-region traffic
- TCP connection timeouts and retries
- Service mesh (Istio) reporting widespread connectivity failures
- Database replication lag spiking to 15+ minutes
- Message queue (Kafka) consumer lag growing exponentially

**Technical Details:**
The ISP experienced a BGP configuration error that caused them to announce incorrect routes for several major cloud provider IP ranges, including AWS. This caused:
1. Traffic destined for AWS to be routed through suboptimal paths
2. Asymmetric routing where outbound and inbound traffic took different paths
3. Packet loss due to congested links in the incorrect routing path
4. Increased latency as traffic traversed additional hops
5. TCP connection failures due to timeout and retransmission issues

The issue was compounded by our microservices architecture where services make numerous inter-service calls. Each service call experienced the network degradation, leading to:
- Cascading timeouts across the service mesh
- Circuit breakers opening across 80% of services
- Request queues backing up
- Memory pressure from connection pool exhaustion
- Auto-scaling triggered but unable to help due to network issues`,
        `**Customer Impact:**
- 3 hours 42 minutes of severe service degradation
- 73% of API requests experienced high latency (>5s response time)
- 28% of API requests failed completely with timeout errors
- Payment processing success rate dropped to 45%
- Order creation success rate dropped to 52%
- User authentication intermittently failing (35% failure rate)
- Search functionality completely unavailable for 45 minutes
- Customer support overwhelmed with 1,200+ tickets
- Mobile app users experienced "No Internet Connection" errors
- Estimated 8,500 customers directly impacted

**Business Impact:**
- Estimated revenue loss: $312,000
- SLA breaches for 12 enterprise customers
- Negative press coverage and social media backlash
- Emergency customer communications required
- Potential contract penalties for SLA violations
- Brand reputation damage
- Lost customer trust

**Technical Impact:**
- 80% of microservices had circuit breakers open
- Database replication lag reached 15 minutes
- Kafka consumer lag exceeded 2 million messages
- Auto-scaling ineffective due to network constraints
- Monitoring system partially blind due to metric collection failures
- Log aggregation delayed by 30+ minutes
- 156 services affected across 3 regions
- On-call engineers from 8 teams engaged

**Regional Breakdown:**
- us-east-1: 65% degradation, primary impact on Payment and Order services
- eu-west-1: 45% degradation, primary impact on Auth and User services
- ap-southeast-1: 80% degradation, Search and Analytics completely down`,
        `**Root Cause:**
BGP route leak from upstream Tier-1 ISP caused by a configuration error during routine maintenance. The ISP accidentally announced incorrect BGP routes for AWS IP ranges, causing global routing instability. This was entirely outside our control and affected multiple companies using the same ISP and cloud provider.

**Why It Impacted Us Severely:**
1. **Tight Service Coupling:** Our microservices architecture has high inter-service communication, amplifying network issues
2. **Aggressive Timeouts:** Service timeout configurations (2s) were too aggressive for degraded network conditions
3. **Insufficient Circuit Breaker Tuning:** Circuit breakers opened too quickly, preventing recovery
4. **Single ISP Dependency:** All regions used the same upstream ISP without diverse routing
5. **Lack of Regional Isolation:** Services in one region depended on services in other regions
6. **No Graceful Degradation:** Services failed completely rather than degrading gracefully
7. **Monitoring Gaps:** Network path monitoring was insufficient to detect routing issues early

**Contributing Factors:**
- No BGP monitoring or route validation on our end
- Insufficient network redundancy and diverse routing paths
- Service mesh not configured for high-latency scenarios
- Database replication not tuned for network instability
- No automated failover to backup ISP routes
- Incident response delayed due to initial misdiagnosis (thought it was AWS issue)

**Timeline of Events:**
- 09:15:00 - Network latency spike detected across all regions
- 09:16:30 - Packet loss alerts firing, services timing out
- 09:18:00 - Circuit breakers opening across service mesh
- 09:20:00 - Incident declared, war room established
- 09:35:00 - Initially suspected AWS network issue
- 10:15:00 - Identified BGP route leak from ISP via traceroute analysis
- 10:30:00 - Contacted ISP support, escalated to network operations
- 11:45:00 - ISP rolled back BGP configuration, routes stabilizing`,
        `**Immediate Response (09:15 - 10:30):**
1. Incident detected via monitoring alerts for high latency and packet loss (09:15)
2. War room established, incident lead assigned (09:20)
3. Initial investigation focused on application layer (09:20-09:45)
4. Checked AWS Service Health Dashboard - no reported issues (09:30)
5. Performed network diagnostics: traceroute, MTR, ping tests (09:45)
6. Identified abnormal routing paths via traceroute analysis (10:00)
7. Discovered traffic routing through unexpected ASNs (10:15)
8. Confirmed BGP route leak from upstream ISP (10:20)
9. Opened critical support ticket with ISP (10:25)
10. Escalated to ISP Network Operations Center (10:30)

**Mitigation Efforts (10:30 - 11:45):**
1. Increased service timeouts from 2s to 10s to reduce failures (10:35)
2. Adjusted circuit breaker thresholds to be more tolerant (10:40)
3. Scaled up service instances to handle retry load (10:45)
4. Disabled non-critical background jobs to reduce network load (10:50)
5. Implemented request prioritization for critical paths (11:00)
6. Enabled read-only mode for non-essential services (11:10)
7. Configured services to prefer local region resources (11:20)
8. Continuous communication with ISP for status updates (10:30-11:45)
9. ISP identified and rolled back problematic BGP configuration (11:30)
10. Network routes began stabilizing (11:45)
11. Latency and packet loss returning to normal levels (11:50)

**Full Resolution (11:45 - 12:57):**
1. Monitored network metrics returning to baseline (11:45-12:00)
2. Gradually restored circuit breaker settings (12:00)
3. Restored service timeouts to normal values (12:10)
4. Scaled services back to normal capacity (12:15)
5. Re-enabled background jobs and batch processing (12:20)
6. Verified database replication caught up (12:30)
7. Confirmed Kafka consumer lag processing (12:35)
8. Validated all services operating normally (12:45)
9. Ran synthetic transaction tests across all regions (12:50)
10. Incident marked as resolved (12:57)

**Post-Incident (12:57 - 14:00):**
1. Customer communication sent explaining the outage (13:00)
2. Detailed network analysis and packet captures archived (13:15)
3. Documented ISP incident reference number for SLA claims (13:20)
4. Reviewed and prioritized action items (13:30)
5. Scheduled post-mortem for next day (13:45)
6. Incident closed after final verification (14:00)`
      ]
    );
    
    const incident2Id = incident2Result.rows[0].id;
    console.log('Created Incident 2:', incident2Result.rows[0].incident_number);

    // Timeline events for Incident 2
    const incident2Timeline = [
      { type: 'detected', desc: 'Network latency spike detected across all regions. API response times increased from 50ms to 5000ms+. Packet loss at 40-60%.', user: 'frank.miller@company.com', time: '2024-12-03T09:15:00Z' },
      { type: 'investigation', desc: 'War room established. Circuit breakers opening across 80% of services. Initial investigation focused on application layer.', user: 'david.brown@company.com', time: '2024-12-03T09:20:00Z' },
      { type: 'investigation', desc: 'Checked AWS Service Health Dashboard - no reported issues. Performing network diagnostics.', user: 'frank.miller@company.com', time: '2024-12-03T09:30:00Z' },
      { type: 'investigation', desc: 'Traceroute analysis reveals abnormal routing paths. Traffic routing through unexpected ASNs. Suspected BGP issue.', user: 'frank.miller@company.com', time: '2024-12-03T10:00:00Z' },
      { type: 'investigation', desc: 'Confirmed BGP route leak from upstream ISP. Root cause identified as ISP configuration error.', user: 'frank.miller@company.com', time: '2024-12-03T10:20:00Z' },
      { type: 'communication', desc: 'Opened critical support ticket with ISP. Escalated to ISP Network Operations Center.', user: 'david.brown@company.com', time: '2024-12-03T10:30:00Z' },
      { type: 'action', desc: 'Increased service timeouts to 10s and adjusted circuit breaker thresholds to reduce failures during network degradation.', user: 'grace.wilson@company.com', time: '2024-12-03T10:35:00Z' },
      { type: 'action', desc: 'Scaled up service instances and disabled non-critical background jobs to reduce network load.', user: 'grace.wilson@company.com', time: '2024-12-03T10:50:00Z' },
      { type: 'action', desc: 'Implemented request prioritization for critical paths. Enabled read-only mode for non-essential services.', user: 'henry.moore@company.com', time: '2024-12-03T11:00:00Z' },
      { type: 'communication', desc: 'ISP identified problematic BGP configuration and initiated rollback procedure.', user: 'david.brown@company.com', time: '2024-12-03T11:30:00Z' },
      { type: 'mitigated', desc: 'ISP rolled back BGP configuration. Network routes stabilizing. Latency and packet loss returning to normal.', user: 'david.brown@company.com', time: '2024-12-03T11:45:00Z' },
      { type: 'action', desc: 'Gradually restoring circuit breaker settings and service timeouts to normal values.', user: 'grace.wilson@company.com', time: '2024-12-03T12:00:00Z' },
      { type: 'action', desc: 'Database replication caught up. Kafka consumer lag processing. All services operating normally.', user: 'henry.moore@company.com', time: '2024-12-03T12:30:00Z' },
      { type: 'resolved', desc: 'All systems verified operational. Synthetic transaction tests passing across all regions. Incident resolved.', user: 'david.brown@company.com', time: '2024-12-03T12:57:00Z' },
      { type: 'communication', desc: 'Customer communication sent explaining the network outage and ISP issue.', user: 'emma.davis@company.com', time: '2024-12-03T13:00:00Z' },
    ];

    for (const event of incident2Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident2Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 2
    const incident2Actions = [
      { desc: 'Implement BGP monitoring and route validation to detect routing anomalies', user: 'frank.miller@company.com', completed: false },
      { desc: 'Establish diverse routing with secondary ISP for network redundancy', user: 'frank.miller@company.com', completed: false },
      { desc: 'Tune service timeouts and circuit breakers for high-latency scenarios', user: 'grace.wilson@company.com', completed: true },
      { desc: 'Implement graceful degradation patterns across all critical services', user: 'grace.wilson@company.com', completed: false },
      { desc: 'Improve regional isolation to reduce cross-region dependencies', user: 'henry.moore@company.com', completed: false },
      { desc: 'Enhance network monitoring with path analysis and latency tracking', user: 'frank.miller@company.com', completed: true },
      { desc: 'Create runbook for network-related incidents with ISP escalation procedures', user: 'david.brown@company.com', completed: true },
      { desc: 'Review and update SLA agreements with ISP, document incident for claims', user: 'david.brown@company.com', completed: true },
    ];

    for (const action of incident2Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident2Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 2
    const incident2Services = ['Payment API', 'Order Processing API', 'User Auth API', 'Inventory API'];
    for (const serviceName of incident2Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident2Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 2 with timeline and action items');

    // ============================================================================
    // INCIDENT 3: Failed Deployment Fixed with Hotfix Canary
    // ============================================================================
    console.log('Creating Incident 3: Failed Deployment with Canary Hotfix...');
    
    const incident3Result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, created_at, detected_at,
        mitigated_at, resolved_at, closed_at, problem_statement, impact, causes, steps_to_resolve
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (incident_number) DO UPDATE SET
        title = $2, description = $3, severity = $4, status = $5
      RETURNING *`,
      [
        'INC-2025-001',
        'Payment API Outage - Failed Deployment Rollback via Canary Hotfix',
        'Critical payment processing outage caused by failed deployment of v2.8.0 that introduced a memory leak and database connection pool exhaustion. Initial rollback failed due to database migration incompatibility. Resolved via emergency canary hotfix deployment of v2.8.1 with connection pool fixes.',
        'critical',
        'resolved',
        userIds['alice.johnson@company.com'],
        userIds['grace.wilson@company.com'],
        '2025-01-08T16:45:00Z',
        '2025-01-08T16:45:00Z',
        '2025-01-08T18:20:00Z',
        '2025-01-08T19:15:00Z',
        '2025-01-08T20:30:00Z',
        `At 16:45 UTC on January 8, 2025, the Payment API experienced a critical outage following the deployment of version 2.8.0 to production. The deployment introduced two critical bugs: a memory leak and database connection pool exhaustion. Initial rollback failed due to database migration incompatibility, requiring an emergency canary hotfix deployment.`,
        `**Customer Impact:**
- 1 hour 35 minutes of complete payment processing outage
- 100% of payment transactions failed during peak hours
- Estimated 4,892 failed payment attempts
- 2,347 customers unable to complete purchases
- Estimated revenue loss: $245,000`,
        `**Root Cause:**
Two critical bugs were introduced in the v2.8.0 release: a memory leak in payment validation logic and a connection pool bug where connections were not properly released in error scenarios.`,
        `**Resolution:**
Emergency hotfix v2.8.1 was developed and deployed using canary deployment strategy (10% → 25% → 50% → 100%) to safely restore service without database rollback.`
      ]
    );
    
    const incident3Id = incident3Result.rows[0].id;
    console.log('Created Incident 3:', incident3Result.rows[0].incident_number);

    // Timeline events for Incident 3
    const incident3Timeline = [
      { type: 'detected', desc: 'Payment API connection pool exhaustion detected. 100% of payment transactions failing.', user: 'grace.wilson@company.com', time: '2025-01-08T16:45:00Z' },
      { type: 'investigation', desc: 'War room established. Memory usage at 95%, connection pool exhausted.', user: 'alice.johnson@company.com', time: '2025-01-08T16:50:00Z' },
      { type: 'investigation', desc: 'Rollback to v2.7.5 failed - application incompatible with new database schema.', user: 'bob.smith@company.com', time: '2025-01-08T17:15:00Z' },
      { type: 'action', desc: 'Decision made to roll forward with emergency hotfix. Creating v2.8.1 with bug fixes.', user: 'alice.johnson@company.com', time: '2025-01-08T17:15:00Z' },
      { type: 'action', desc: 'Fixed memory leak and connection pool bug. Built and tested v2.8.1 hotfix.', user: 'bob.smith@company.com', time: '2025-01-08T17:50:00Z' },
      { type: 'action', desc: 'Canary deployment at 10%. Monitoring metrics - memory stable, connections healthy.', user: 'carol.williams@company.com', time: '2025-01-08T17:55:00Z' },
      { type: 'action', desc: 'Increased canary to 50%. Metrics looking good. Proceeding with full deployment.', user: 'carol.williams@company.com', time: '2025-01-08T18:15:00Z' },
      { type: 'mitigated', desc: 'Deployed v2.8.1 to 100% of instances. Service fully restored. Payment success rate at 100%.', user: 'alice.johnson@company.com', time: '2025-01-08T18:20:00Z' },
      { type: 'resolved', desc: 'All systems verified operational. End-to-end payment tests passing. Incident resolved.', user: 'alice.johnson@company.com', time: '2025-01-08T19:15:00Z' },
    ];

    for (const event of incident3Timeline) {
      await pool.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [incident3Id, event.type, event.desc, userIds[event.user], event.time]
      );
    }

    // Action items for Incident 3
    const incident3Actions = [
      { desc: 'Implement mandatory canary deployments for all production releases', user: 'carol.williams@company.com', completed: true },
      { desc: 'Extend load testing duration to minimum 2 hours to catch memory leaks', user: 'bob.smith@company.com', completed: true },
      { desc: 'Add automated memory leak detection to CI/CD pipeline', user: 'bob.smith@company.com', completed: false },
      { desc: 'Implement connection pool monitoring with automatic alerts', user: 'grace.wilson@company.com', completed: true },
      { desc: 'Decouple database migrations from application deployments', user: 'bob.smith@company.com', completed: false },
      { desc: 'Document emergency hotfix and canary deployment procedures', user: 'alice.johnson@company.com', completed: true },
    ];

    for (const action of incident3Actions) {
      await pool.query(
        `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
         VALUES ($1, $2, $3, $4)`,
        [incident3Id, action.desc, userIds[action.user], action.completed]
      );
    }

    // Link services to Incident 3
    const incident3Services = ['Payment API', 'Order Processing API', 'Billing API'];
    for (const serviceName of incident3Services) {
      await pool.query(
        `INSERT INTO incident_services (incident_id, runbook_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [incident3Id, runbookIds[serviceName]]
      );
    }

    console.log('Created Incident 3 with timeline and action items');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
