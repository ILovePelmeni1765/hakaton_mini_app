import { ACHIEVEMENTS } from '@pulse/shared';
import { PrismaClient, ProblemCategory, ProblemPriority, ProblemStatus, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const localAsset = (name: string) => `/demo/${name}`;

async function clear() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.reputationEvent.deleteMany(), prisma.userAchievement.deleteMany(),
    prisma.achievement.deleteMany(), prisma.missionParticipation.deleteMany(), prisma.mission.deleteMany(),
    prisma.notification.deleteMany(), prisma.statusHistory.deleteMany(), prisma.resolutionVote.deleteMany(),
    prisma.problemMedia.deleteMany(), prisma.resolutionReport.deleteMany(), prisma.assignment.deleteMany(),
    prisma.comment.deleteMany(), prisma.problemSubscription.deleteMany(), prisma.problemConfirmation.deleteMany(),
    prisma.problem.deleteMany(), prisma.user.deleteMany(), prisma.organization.deleteMany(), prisma.district.deleteMany(), prisma.city.deleteMany(),
  ]);
}

async function main() {
  if (process.env.SEED_RESET !== 'true' && await prisma.city.count() > 0) {
    console.log('Seed skipped: demo data already exists (set SEED_RESET=true to recreate)');
    return;
  }
  await clear();
  const passwordHash = await hash('pulse2026', 10);
  const city = await prisma.city.create({ data: { name: 'Новосибирск' } });
  const districts = await Promise.all([
    prisma.district.create({ data: { cityId: city.id, name: 'Центральный район', slug: 'central', centerLat: 55.0302, centerLng: 82.9204, cleanliness: 76, safety: 82, lighting: 68, accessibility: 61, roads: 70, improvement: 78 } }),
    prisma.district.create({ data: { cityId: city.id, name: 'Железнодорожный район', slug: 'railway', centerLat: 55.0411, centerLng: 82.9051, cleanliness: 72, safety: 78, lighting: 73, accessibility: 64, roads: 67, improvement: 74 } }),
    prisma.district.create({ data: { cityId: city.id, name: 'Октябрьский район', slug: 'october', centerLat: 55.0185, centerLng: 82.9505, cleanliness: 69, safety: 75, lighting: 71, accessibility: 59, roads: 63, improvement: 70 } }),
  ]);
  const organizations = await Promise.all([
    prisma.organization.create({ data: { cityId: city.id, name: 'Горсвет Новосибирска', verified: true } }),
    prisma.organization.create({ data: { cityId: city.id, name: 'ДЭУ Центрального района', verified: true } }),
    prisma.organization.create({ data: { cityId: city.id, name: 'Спецавтохозяйство', verified: true } }),
    prisma.organization.create({ data: { cityId: city.id, name: 'Городская служба благоустройства', verified: true } }),
  ]);
  const users = await Promise.all([
    prisma.user.create({ data: { email: 'resident@pulse.local', passwordHash, displayName: 'Анна Соколова', role: 'RESIDENT', districtId: districts[0].id, reputation: 184, trustLevel: 4, usefulStreak: 6 } }),
    prisma.user.create({ data: { email: 'resident2@pulse.local', passwordHash, displayName: 'Михаил Левин', role: 'RESIDENT', districtId: districts[0].id, reputation: 126, trustLevel: 3, usefulStreak: 3 } }),
    prisma.user.create({ data: { email: 'resident3@pulse.local', passwordHash, displayName: 'Елена Ким', role: 'RESIDENT', districtId: districts[0].id, reputation: 98, trustLevel: 3, usefulStreak: 2 } }),
    prisma.user.create({ data: { email: 'resident4@pulse.local', passwordHash, displayName: 'Илья Громов', role: 'RESIDENT', districtId: districts[1].id, reputation: 76, trustLevel: 2 } }),
    prisma.user.create({ data: { email: 'operator@pulse.local', passwordHash, displayName: 'Ольга Воронова', role: 'OPERATOR', districtId: districts[0].id, reputation: 0, trustLevel: 5 } }),
    prisma.user.create({ data: { email: 'contractor@pulse.local', passwordHash, displayName: 'Сергей Орлов', role: 'CONTRACTOR', organizationId: organizations[0].id, districtId: districts[0].id, trustLevel: 5 } }),
    prisma.user.create({ data: { email: 'contractor2@pulse.local', passwordHash, displayName: 'Виктор Макаров', role: 'CONTRACTOR', organizationId: organizations[1].id, districtId: districts[1].id, trustLevel: 5 } }),
    prisma.user.create({ data: { email: 'admin@pulse.local', passwordHash, displayName: 'Алексей Миронов', role: 'ADMIN', districtId: districts[0].id, trustLevel: 5 } }),
  ]);
  const [anna, michael, elena, ilya, operator, lightWorker, roadWorker, admin] = users;

  const problemData: Array<{ title: string; description: string; category: ProblemCategory; status: ProblemStatus; priority: ProblemPriority; address: string; lat: number; lng: number; district: number; author: number; dueOffset?: number; before?: string; after?: string }> = [
    { title: 'Не работает фонарь у пешеходного перехода', description: 'Вечером переход полностью остаётся без освещения, водителям плохо видно людей.', category: 'LIGHTING', status: 'AWAITING_COMMUNITY_CONFIRMATION', priority: 'HIGH', address: 'Красный проспект, 31', lat: 55.0308, lng: 82.9198, district: 0, author: 0, before: 'LOCAL:streetlight-before.webp' },
    { title: 'Открытый люк рядом со школой', description: 'Крышка отсутствует, место временно огорожено ветками.', category: 'OPEN_MANHOLE', status: 'OPERATOR_REVIEW', priority: 'CRITICAL', address: 'ул. Романова, 23', lat: 55.0342, lng: 82.9256, district: 0, author: 1, before: 'photo-1584467541268-b040f83be3fd' },
    { title: 'Глубокая яма в правой полосе', description: 'Повреждение асфальта вынуждает машины резко перестраиваться.', category: 'ROAD', status: 'ASSIGNED', priority: 'HIGH', address: 'ул. Фрунзе, 18', lat: 55.0383, lng: 82.9351, district: 0, author: 2, dueOffset: 5, before: 'photo-1515162816999-a0c47dc192f7' },
    { title: 'Переполнены контейнеры', description: 'Мусор не вывозили несколько дней, пакеты лежат рядом.', category: 'WASTE', status: 'IN_PROGRESS', priority: 'NORMAL', address: 'ул. Державина, 15', lat: 55.0442, lng: 82.9232, district: 0, author: 0, dueOffset: 1, before: 'photo-1530587191325-3db32d826c18' },
    { title: 'Разбит бордюр и тротуар', description: 'На узком участке трудно пройти с коляской.', category: 'SIDEWALK', status: 'COMMUNITY_VERIFICATION', priority: 'NORMAL', address: 'Советская ул., 22', lat: 55.0276, lng: 82.9143, district: 0, author: 1, after: 'photo-1534274988757-a28bf1a57c17' },
    { title: 'Повреждена крыша остановки', description: 'Один лист поликарбоната сорван ветром.', category: 'PUBLIC_TRANSPORT', status: 'RESOLVED', priority: 'NORMAL', address: 'Вокзальная магистраль, 8', lat: 55.0389, lng: 82.9064, district: 1, author: 3, after: 'photo-1494526585095-c41746248156' },
    { title: 'Нет съезда для коляски', description: 'Высокий бордюр блокирует доступ к поликлинике.', category: 'ACCESSIBILITY', status: 'OPERATOR_REVIEW', priority: 'HIGH', address: 'Серебренниковская ул., 42', lat: 55.0197, lng: 82.9286, district: 2, author: 2, before: 'photo-1500530855697-b586d89ba3ee' },
    { title: 'Сломаны качели на площадке', description: 'Цепь крепления повреждена, пользоваться опасно.', category: 'PLAYGROUND', status: 'NEEDS_MORE_INFO', priority: 'HIGH', address: 'ул. Чаплыгина, 92', lat: 55.0237, lng: 82.9126, district: 0, author: 0, before: 'photo-1596997000103-e597b3ca50df' },
    { title: 'Не убран снег с лестницы', description: 'Ступени обледенели после снегопада.', category: 'SNOW', status: 'RESOLVED', priority: 'HIGH', address: 'ул. Ленина, 12', lat: 55.0295, lng: 82.9104, district: 1, author: 3, after: 'photo-1517299321609-52687d1bc55a' },
    { title: 'Течёт вода из колодца', description: 'Вода выходит на проезжую часть и размывает покрытие.', category: 'WATER_LEAK', status: 'DISPUTED', priority: 'CRITICAL', address: 'ул. Кирова, 44', lat: 55.0124, lng: 82.9438, district: 2, author: 2, dueOffset: -2, before: 'photo-1545259741-2ea3ebf61fa3' },
    { title: 'Знак закрыт ветками', description: 'Предупреждающий знак не виден со стороны перекрёстка.', category: 'ROAD_SIGN', status: 'AWAITING_COMMUNITY_CONFIRMATION', priority: 'NORMAL', address: 'ул. Октябрьская, 35', lat: 55.0211, lng: 82.9191, district: 0, author: 1 },
    { title: 'Упало дерево на газон', description: 'Ствол частично перекрывает пешеходную дорожку.', category: 'FALLEN_TREE', status: 'OPERATOR_VERIFICATION', priority: 'HIGH', address: 'Нарымская ул., 17', lat: 55.0467, lng: 82.9079, district: 1, author: 3, after: 'photo-1473445361085-b9a07f55608b' },
    { title: 'Мигает свет во дворе', description: 'Светильник постоянно включается и выключается.', category: 'LIGHTING', status: 'IN_PROGRESS', priority: 'NORMAL', address: 'ул. Каменская, 51', lat: 55.0358, lng: 82.9332, district: 0, author: 0, dueOffset: 2 },
    { title: 'Провал асфальта у ливнёвки', description: 'Край покрытия продолжает разрушаться после дождя.', category: 'ROAD', status: 'REOPENED', priority: 'HIGH', address: 'ул. Шевченко, 28', lat: 55.0156, lng: 82.9369, district: 2, author: 2 },
    { title: 'Граффити на фасаде школы', description: 'Надписи появились на выходных.', category: 'OTHER', status: 'RESOLVED', priority: 'LOW', address: 'ул. Гоголя, 9', lat: 55.0435, lng: 82.9147, district: 1, author: 3, after: 'photo-1494522358652-f30e61a60313' },
    { title: 'Разбитое покрытие у подъезда', description: 'Плитка шатается и создаёт риск падения.', category: 'SIDEWALK', status: 'COMMUNITY_CONFIRMED', priority: 'NORMAL', address: 'ул. Крылова, 34', lat: 55.0421, lng: 82.9294, district: 0, author: 1 },
    { title: 'Контейнерная площадка без ограждения', description: 'Мусор разносит ветром по двору.', category: 'WASTE', status: 'ASSIGNED', priority: 'NORMAL', address: 'ул. 1905 года, 18', lat: 55.0447, lng: 82.8997, district: 1, author: 3, dueOffset: 7 },
    { title: 'Пандус перекрыт рекламной стойкой', description: 'Проезд к аптеке невозможен для кресла-коляски.', category: 'ACCESSIBILITY', status: 'RESOLVED', priority: 'HIGH', address: 'Октябрьская магистраль, 4', lat: 55.0229, lng: 82.9314, district: 2, author: 2, after: 'photo-1534274988757-a28bf1a57c17' },
    { title: 'Не горит подсветка остановки', description: 'В темноте пассажиры не видят расписание.', category: 'LIGHTING', status: 'COMMUNITY_VERIFICATION', priority: 'NORMAL', address: 'Красный проспект, 65', lat: 55.0429, lng: 82.9184, district: 0, author: 0, before: 'LOCAL:streetlight-before.webp', after: 'LOCAL:streetlight-after.webp' },
    { title: 'Повреждена урна в сквере', description: 'Корпус урны сломан и имеет острый край.', category: 'OTHER', status: 'REJECTED', priority: 'LOW', address: 'Первомайский сквер', lat: 55.0288, lng: 82.9227, district: 0, author: 1 },
  ];

  const created = [];
  for (const [index, item] of problemData.entries()) {
    const author = users[item.author]!;
    const problem = await prisma.problem.create({ data: {
      title: item.title, description: item.description, category: item.category, status: item.status, priority: item.priority,
      address: item.address, latitude: item.lat, longitude: item.lng, districtId: districts[item.district]!.id, authorId: author.id,
      dueAt: item.dueOffset === undefined ? null : new Date(Date.now() + item.dueOffset * 86_400_000), resolvedAt: item.status === 'RESOLVED' ? new Date(Date.now() - 2 * 86_400_000) : null,
      rejectionReason: item.status === 'REJECTED' ? 'Объект находится на частной территории' : null,
    } });
    created.push(problem);
    await prisma.problemSubscription.create({ data: { problemId: problem.id, userId: author.id } });
    await prisma.statusHistory.create({ data: { problemId: problem.id, actorId: item.status === 'AWAITING_COMMUNITY_CONFIRMATION' ? author.id : operator.id, toStatus: item.status, reason: index === 0 ? 'Новое обращение: готово к демонстрационному сценарию' : 'Демонстрационная история' } });
    if (item.before?.startsWith('LOCAL:')) await prisma.problemMedia.create({ data: { problemId: problem.id, url: localAsset(item.before.slice(6)), mimeType: 'image/webp', size: 121000, kind: 'BEFORE', alt: `До устранения: ${item.title}` } });
    if (item.after?.startsWith('LOCAL:')) await prisma.problemMedia.create({ data: { problemId: problem.id, url: localAsset(item.after.slice(6)), mimeType: 'image/webp', size: 175000, kind: 'AFTER', alt: `После работ: ${item.title}` } });
  }

  for (const problem of created.slice(1, 19)) {
    if (!['REJECTED', 'AWAITING_COMMUNITY_CONFIRMATION'].includes(problem.status)) {
      await prisma.problemConfirmation.createMany({ data: [{ problemId: problem.id, userId: anna.id, type: 'EXISTS', trustWeight: 1.4 }, { problemId: problem.id, userId: michael.id, type: 'EXISTS', trustWeight: 1.3 }], skipDuplicates: true });
    }
  }

  await prisma.comment.createMany({ data: [
    { problemId: created[0]!.id, authorId: anna.id, type: 'RESIDENT', body: 'Фонарь не работает уже третий вечер. Особенно темно после 21:00.' },
    { problemId: created[1]!.id, authorId: operator.id, type: 'OFFICIAL', body: 'Информация передана аварийной бригаде. Просим не приближаться к люку.', isPinned: true },
    { problemId: created[4]!.id, authorId: roadWorker.id, type: 'CONTRACTOR', body: 'Повреждённый участок заменён, проход открыт.' },
    { problemId: created[9]!.id, authorId: elena.id, type: 'RESIDENT', body: 'После отчёта вода всё ещё появляется утром.' },
  ] });

  for (const index of [2, 3, 4, 8, 11, 12, 14, 16, 17, 18]) {
    const problem = created[index]!;
    const org = problem.category === 'LIGHTING' ? organizations[0]! : problem.category === 'WASTE' ? organizations[2]! : organizations[1]!;
    const employee = org.id === organizations[0]!.id ? lightWorker : roadWorker;
    await prisma.assignment.create({ data: { problemId: problem.id, organizationId: org.id, employeeId: employee.id, status: ['IN_PROGRESS'].includes(problem.status) ? 'IN_PROGRESS' : ['RESOLVED', 'COMMUNITY_VERIFICATION', 'OPERATOR_VERIFICATION'].includes(problem.status) ? 'COMPLETED' : 'ASSIGNED', plannedAt: problem.dueAt ?? new Date(Date.now() + 3 * 86_400_000) } });
    if (['RESOLVED', 'COMMUNITY_VERIFICATION', 'OPERATOR_VERIFICATION'].includes(problem.status)) {
      await prisma.resolutionReport.create({ data: { problemId: problem.id, authorId: employee.id, organizationId: org.id, summary: 'Работы выполнены по регламенту. Территория приведена в безопасное состояние.' } });
    }
  }

  await prisma.resolutionVote.createMany({ data: [
    { problemId: created[4]!.id, userId: anna.id, vote: 'FULLY_RESOLVED', comment: 'Прошла сегодня — тротуар ровный.' },
    { problemId: created[4]!.id, userId: michael.id, vote: 'FULLY_RESOLVED' },
    { problemId: created[9]!.id, userId: anna.id, vote: 'STILL_PRESENT', comment: 'Вода снова появилась.' },
    { problemId: created[18]!.id, userId: michael.id, vote: 'FULLY_RESOLVED' },
  ] });

  const missions = await Promise.all([
    prisma.mission.create({ data: { cityId: city.id, districtId: districts[0].id, title: 'Свет у школ', description: 'Проверьте освещение возле школ и пешеходных переходов после заката.', icon: 'lamp', target: 60, reward: 40, startsAt: new Date(Date.now() - 2 * 86_400_000), endsAt: new Date(Date.now() + 5 * 86_400_000), status: 'ACTIVE' } }),
    prisma.mission.create({ data: { cityId: city.id, title: 'Доступный маршрут', description: 'Отметьте препятствия на пути к остановкам и социальным объектам.', icon: 'accessibility', target: 100, reward: 60, startsAt: new Date(Date.now() + 3 * 86_400_000), endsAt: new Date(Date.now() + 10 * 86_400_000), status: 'UPCOMING' } }),
  ]);
  await prisma.missionParticipation.createMany({ data: [{ missionId: missions[0].id, userId: anna.id, progress: 4 }, { missionId: missions[0].id, userId: michael.id, progress: 3 }, { missionId: missions[0].id, userId: elena.id, progress: 2 }] });

  const achievements = await Promise.all(ACHIEVEMENTS.map(({ code, title, description, icon }) => prisma.achievement.create({ data: { code, title, description, icon } })));
  await prisma.userAchievement.createMany({ data: [{ userId: anna.id, achievementId: achievements[0].id }, { userId: anna.id, achievementId: achievements[1].id }, { userId: anna.id, achievementId: achievements[5].id }, { userId: michael.id, achievementId: achievements[0].id }, { userId: michael.id, achievementId: achievements[2].id }] });

  await prisma.notification.createMany({ data: [
    { userId: anna.id, problemId: created[18]!.id, type: 'COMMUNITY_VERIFICATION', title: 'Нужна ваша проверка', body: 'Исполнитель починил подсветку остановки. Проверьте результат.' },
    { userId: anna.id, problemId: created[3]!.id, type: 'WORK_STARTED', title: 'Работы начались', body: 'Спецавтохозяйство приняло задачу в работу.' },
    { userId: anna.id, type: 'MISSION_NEARBY', title: 'Новая миссия рядом', body: 'Проверьте освещение возле школ до воскресенья.' },
    { userId: operator.id, problemId: created[1]!.id, type: 'OPERATOR_ACCEPTED', title: 'Опасная проблема', body: 'Открытый люк требует немедленной проверки.' },
  ] });

  await prisma.auditLog.createMany({ data: [
    { actorId: operator.id, problemId: created[2]!.id, action: 'STATUS_ASSIGNED', entityType: 'Problem', entityId: created[2]!.id, metadata: { organization: organizations[1].name } },
    { actorId: operator.id, problemId: created[9]!.id, action: 'STATUS_DISPUTED', entityType: 'Problem', entityId: created[9]!.id, metadata: { reason: 'Отрицательная общественная проверка' } },
    { actorId: admin.id, action: 'MISSION_CREATED', entityType: 'Mission', entityId: missions[0].id },
  ] });

  console.log('Seed completed: 1 city, 3 districts, 20 problems, 8 users');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());
