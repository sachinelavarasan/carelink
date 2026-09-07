import type { DoctorPublic } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { BackLink } from '../components/BackLink';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { buttonVariants } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { apiGet, errMessage } from '../lib/api';

export default function DoctorProfile() {
  const { id = '' } = useParams();
  const doctorQ = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => apiGet<DoctorPublic>(`/doctors/${id}`),
  });

  return (
    <AppShell>
      <BackLink to="/doctors">All doctors</BackLink>

      {doctorQ.isLoading && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      )}
      {doctorQ.isError && (
        <div className="mt-3">
          <Notice kind="error">{errMessage(doctorQ.error, 'Doctor not found')}</Notice>
        </div>
      )}

      {doctorQ.data && (
        <Card className="mt-3">
          <CardContent className="grid gap-2">
            <h1 className="text-xl font-semibold">{doctorQ.data.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {doctorQ.data.specializations.join(', ')} · {doctorQ.data.qualifications}
            </p>
            <p className="text-sm text-muted-foreground">
              {doctorQ.data.yearsExperience} years&apos; experience · consultation fee ₹
              {doctorQ.data.consultationFeeInr}
              {doctorQ.data.clinicName ? ` · ${doctorQ.data.clinicName}` : ''}
            </p>
            {doctorQ.data.bio && <p className="mt-1 text-sm">{doctorQ.data.bio}</p>}

            {(doctorQ.data.clinicAddress ||
              doctorQ.data.clinicMapUrl ||
              doctorQ.data.clinicPhone) && (
              <div className="mt-2 grid gap-1 border-t pt-3 text-sm">
                <span className="font-medium">
                  {doctorQ.data.clinicName ?? 'Clinic'}
                </span>
                {doctorQ.data.clinicAddress && (
                  <p className="whitespace-pre-line text-muted-foreground">
                    {doctorQ.data.clinicAddress}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4">
                  {doctorQ.data.clinicMapUrl && (
                    <a
                      className="text-primary underline-offset-2 hover:underline"
                      href={doctorQ.data.clinicMapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get directions
                    </a>
                  )}
                  {doctorQ.data.clinicPhone && (
                    <a
                      className="text-primary underline-offset-2 hover:underline"
                      href={`tel:${doctorQ.data.clinicPhone.replace(/\s+/g, '')}`}
                    >
                      {doctorQ.data.clinicPhone}
                    </a>
                  )}
                </div>
              </div>
            )}

            <Link
              className={`${buttonVariants()} mt-2 w-fit`}
              to={`/book?doctorId=${doctorQ.data.id}`}
            >
              Book a consultation
            </Link>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
