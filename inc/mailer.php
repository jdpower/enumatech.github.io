<?php

require_once("../PHPMailer/PHPMailerAutoload.php");
//include("class.smtp.php"); // optional, gets called from within class.phpmailer.php if not already loaded

$mail             = new PHPMailer();

$mail->IsSMTP();
$mail->SMTPAuth   = true;                  // enable SMTP authentication
$mail->SMTPSecure = 'ssl';                 // sets the prefix to the servier
$mail->CharSet    = 'UTF-8';
$mail->Host       = 'lunesu.com';   // sets GMAIL as the SMTP server
$mail->Port       = 465;                   // set the SMTP port for the GMAIL server


$mail->Username   = 'enumawww';          // GMAIL/sendgrid username
// add SetEnv SMTP_PASSWORD "blah" to this site's Apache conf
$mail->Password   = getenv('SMTP_PASSWORD');              // GMAIL/sendgrid password

$mail->From       = 'no-reply@e'.'numa.io';
$mail->FromName   = 'Enuma.io contact form';

$mail->WordWrap   = 60; // set word wrap

function mailer($mail_to, $subject, $body)
{
	global $mail;

	$mail->Subject = $subject;
	$mail->Body = $body;
	$mail->ClearAddresses();
	$mail->AddAddress($mail_to);
	$mail->Send()
		or die('Failed to send email: '.$mail->ErrorInfo);
}

function mail_and_die($subject, $body)
{
  mailer('lio+enumawww@l'.'unesu.com', $subject, $body);
  die($subject."\n".$body);
}


if ( $_SERVER['REQUEST_METHOD'] == 'POST' )
{
  if ($_POST['honey'] == 'nxTdUEHiBbh4z1N')
  {
    mailer('info@enuma.io', 'Request from: '.$_POST['name'].', '.$_POST['emailid'], $_POST['message']);
  }
}
